import express from "express";
import bodyParser from "body-parser";
import pg from "pg"

const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

const { Pool } = pg;
const db = new Pool({
  user: "postgres",
  host: "localhost",
  database: "country",
  password: "",
  port: 5000
})
let showCountryErr = false

app.get("/", (req, res) => {
  res.redirect("/users/default")
});

app.get("/users/:user", async (req, res) => {
  try {
    const user = req.params.user
    const dbCommand = await db.query("select user_id , name , color , country_code from visited_countries join users on users.id = user_id")
    const data = dbCommand.rows
    let userData = data.filter(d => d.name === user)
    let userId = userData[0].user_id
    let userColor = userData[0].color
    let userCountry = []
    userData.forEach(element => {
      if (element.country_code) {
        userCountry.push(element.country_code)
      }
    });
    const totalCountry = userCountry.length

    const nameCommand = await db.query("select * from users order by id")
    const dbNames = nameCommand.rows
    let names = dbNames.map(d => d.name)
    let colors = dbNames.map(c => c.color)
    let id = dbNames.map(i => i.id)

    res.render("index.ejs", {
      allColors: colors || [],
      allId: id || [],
      users: names || [],
      name: user || [],
      id: userId || [],
      countries: userCountry || [],
      color: userColor || [],
      total: totalCountry || 0,
      err: showCountryErr,
    })
  } catch (err) {
    console.log("an error occurred in getting user:" + err.message)
    res.status(404).redirect("/users/default")
  }
  showCountryErr = false
})
app.get("/new_user", (req, res) => {
  res.render("newUser.ejs")
})

app.post("/add_user", async (req, res) => {
  try {
    const user = req.body.name.trim()
    const color = req.body.color.trim()
    const id = await db.query("INSERT INTO users(name , color) VALUES($1 , $2) Returning * ", [user, color])
    await db.query("INSERT INTO visited_countries(user_id) values($1)", [id.rows[0].id])
    res.redirect(`/users/default`)
  } catch (err) {
    console.log("an error occurred in adding new user:" + err.message)
    res.render("newUser.ejs", {
      error: true
    })
  }
})

app.post("/add", async (req, res) => {
  try {
    showCountryErr = false
    const country = req.body.country.trim()
    const id = parseInt(req.body.id)
    const name = req.body.name.trim()
    let findCountry = await db.query("SELECT * FROM countries where country_name like '%' || $1 || '%' ", [country])
    let countryCode = findCountry.rows[0].country_code.trim();
    await db.query("INSERT INTO visited_countries(country_code , user_id) values($1 , $2)", [countryCode, id])
    res.redirect(`/users/${name}`)

  } catch (err) {
    const name = req.body.name.trim()
    console.log("an error occurred in adding:" + err.message)
    showCountryErr = true
    res.redirect(`/users/${name}`)
  }
})

app.post("/remove_country", async (req, res) => {
  try {
    const country_code = req.body.country_code;
    const id = req.body.id;
    await db.query("DELETE FROM visited_countries where country_code = $1 and user_id = $2", [country_code, id]);
    res.status(200).send('Country removed successfully')
  } catch (err) {
    console.log("an error occurred in removing country:" + err.message);
    res.status(500).send("Error deleting country");
  }
});

app.post("/remove_user", async (req, res) => {
  try {
    const id = parseInt(req.body.id);
    await db.query("DELETE FROM visited_countries where user_id = $1", [id]);
    await db.query("DELETE FROM users where id = $1", [id]);
    res.status(200).redirect("/")
  } catch (err) {
    console.log("an error occurred in removing:" + err.message);
    res.status(500).redirect("/");
  }
});

app.post("/edit_user/:id" , async (req, res)=>{
  try {
    const id = parseInt(req.params.id)
    const name = req.body.name.trim()
    await db.query("UPDATE users set name = $1 where id = $2", [name, id])
    res.redirect(`/users/${name}`)
  } catch (err) {
    console.log("an error occurred in editing:" + err.message);
    res.status(500).redirect("/");
  }
})

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});