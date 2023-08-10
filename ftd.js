// https://www.freecodecamp.org/news/express-explained-with-examples-installation-routing-middleware-and-more/
// https://medium.com/@viral_shah/express-middlewares-demystified-f0c2c37ea6a1
// https://www.sohamkamani.com/blog/2018/05/30/understanding-how-expressjs-works/

var port = 8000; 
var express = require('express');
var app = express();

const { Pool } = require('pg')
const pool = new Pool({
    user: 'webdbuser',
    host: 'localhost',
    database: 'webdb',
    password: 'password',
    port: 5432
});

const bodyParser = require('body-parser'); // we used this middleware to parse POST bodies

function isObject(o){ return typeof o === 'object' && o !== null; }
function isNaturalNumber(value) { return /^\d+$/.test(value); }
function validateLogin(username, password){
	var errors="";

	// username: letters,numbers, _
	if(username!=""){
		var u = /^\w+$/.exec(username);
		if(!u)errors+='Username must contain only characters from a-Z, 0-9, _\n';
	}else errors+='Username is required\n';
	
	// password: letters, numbers, _, special characters: ~,!,@,#,$,%,^,&,*,comma, period
	if(password!=""){
		var p = /^[\w\~\!\@\#\$\%\^\&\*\,\.]+$/.exec(password);
		if(!p)errors+='Password must contain only characters from a-Z, 0-9, .,~!@#$%^&*-_\n';
	} else errors+='Password is required\n';

	return errors;
}
function validateProfile(username, password, confirmPassword, email, firstName, lastName, birthday, pizza, soda){
	// username and password
	var errors=validateLogin(username, password);

	// confirmPassword -- re-check if password is valid for making comparison
	var p = /^[\w\~\!\@\#\$\%\^\&\*\,\.]+$/.exec(password);
	if(password!="" && p!=null){
		if(confirmPassword=="")errors+=' Re-enter your password\n';
		else if(password!=confirmPassword)errors+=' Passwords do not match\n';
	}

	// email
	if(email!=""){
		var e = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.exec(email);
		if(!e)errors+="Email must be of the form johnsmith@mail.com\n";
	} else errors+=" Email is required\n";

	// firstName
	if(firstName!=""){
		var fn = /^[a-zA-Z]+$/.exec(firstName);
		if(!fn)errors+='First name must contain only letters\n';
	} else errors+=' First name is required\n';

	// lastName
	if(lastName!=""){
		var ln = /^[a-zA-Z]+$/.exec(lastName);
		if(!ln)errors+='Last name must contain only letters\n';
	} else errors+=' Last name is required\n';

	// birthday
	if(birthday!=""){
		var b = /^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/.exec(birthday);
		if(!b)errors+='Birthday must be in the form of YYYY-MM-DD\n';
	} else errors+=" Birthday is required\n";
	
	// pizza
	if(pizza!='yes' && pizza!='no' || pizza==""){
		errors+=' Please specify if you like pineapple on pizza\n';
	}

	// soda
	if(!['Water', 'Pepsi Cola','Coca Cola', '7UP', 'Sprite', 'Fanta', "President's Choice"].includes(soda) || soda===""){
		errors+=' Please choose one of the listed sodas\n';
	}
	return errors;
}

// app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use(bodyParser.raw()); // support raw bodies

// Non authenticated route. Can visit this without credentials
app.post('/api/test', function (req, res) {
	res.status(200); 
	res.json({"message":"got here"}); 
});

app.get('/api/leaderboard', function (req, res) {
	let sql = `SELECT username, score, difficulty, to_char(datePlayed, 'MM-DD-YYYY') as datePlayed FROM ftdstats ORDER BY score DESC LIMIT 10`;
		pool.query(sql, [], (err, pgRes) => {
			if (err){
				res.status(403).json({ error: 'Not authorized'});
			} else {
				// get data -- even if none in db yet
				res.status(200).json(pgRes.rows);
			}
	});
});

app.post('/api/register', function (req, res) {
	try{

		var username = req.body.username;
		var password = req.body.password;
		var confirmPassword = req.body.confirmPassword;
		var email = req.body.email;
		var firstName = req.body.firstName;
		var lastName = req.body.lastName;
		var birthday = req.body.birthday;
		var pizza = req.body.pizza;
		var soda = req.body.soda;

		var errors = validateProfile(username, password, confirmPassword, email, firstName, lastName, birthday, pizza, soda);
		if (errors)throw new Error(errors);
		
		// check user exists
		let sql = 'SELECT * FROM ftduser WHERE username=$1';
		pool.query(sql, [username], (err, pgRes) => {
  			if (err){
				res.status(403).json({ error: 'Not authorized'});
			} else if(pgRes.rowCount == 1){
				//The user already exists
				res.status(409).json({ error: 'User already exists'});
			} else {
				//Add the user to the db
				let sql = 'INSERT INTO ftduser(username, password, email, firstName, lastName, birthday, pizza, soda) VALUES($1, sha512($2), $3, $4, $5, $6, $7, $8)';
				pool.query(sql, [username, password, email, firstName, lastName, birthday, pizza, soda], (err, pgRes) => {
					if (err){
						res.status(403).json({ error: 'Not authorized'});
					} else {
						// register user
						res.status(200).json('User registered');
					}
				});
			}
		});
	}
	catch(err){
		res.status(400).json({error: err.message});
	}
});


/** 
 * This is middleware to restrict access to subroutes of /api/auth/ 
 * To get past this middleware, all requests should be sent with appropriate
 * credentials. Now this is not secure, but this is a first step.
 *
 * Authorization: Basic YXJub2xkOnNwaWRlcm1hbg==
 * Authorization: Basic " + btoa("arnold:spiderman"); in javascript
**/
app.use('/api/auth', function (req, res,next) {
	if (!req.headers.authorization) {
		return res.status(403).json({ error: 'No credentials sent!' });
  	}
	try {
		// var credentialsString = Buffer.from(req.headers.authorization.split(" ")[1], 'base64').toString();
		var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
		
		var user_pass = Buffer.from(m[1], 'base64').toString();

		var temp = user_pass.split(':');
		var username = temp[0];
		var password = temp[1];

		var errors = validateLogin(username, password);
		if(errors)throw Error(errors);		

		console.log(username+" "+password);
		
		// check user exists
		let sql = 'SELECT * FROM ftduser WHERE username=$1';
			pool.query(sql, [username], (err, pgRes) => {
				if (err){
						res.status(403).json({ error: 'Not authorized'});
				} else if(pgRes.rowCount == 1){
					let sql = 'SELECT * FROM ftduser WHERE username=$1 and password=sha512($2)';
					pool.query(sql, [username, password], (err, pgRes) => {
						if (err){
								res.status(403).json({ error: 'Not authorized'});
						} else if(pgRes.rowCount == 1){
							next(); 
						} else {
								res.status(403).json({ error: 'Incorrect password'});
						}
					});
				} else {
						res.status(404).json({ error: 'User does not exist'});
				}
		});

	} catch(err) {
			res.status(400).json({error: err.message});
	}
});

// All routes below /api/auth require credentials
app.post('/api/auth/login', function (req, res) {
	res.status(200); 
	res.json({"message":"authentication success"}); 
});

app.get('/api/auth/users/:username', function (req, res) {

    let urlUsername = req.params.username;
	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
		
	var user_pass = Buffer.from(m[1], 'base64').toString();

	var temp = user_pass.split(':');
	var validationUsername = temp[0];

	if (urlUsername != validationUsername){
		res.status(403).json({ error: 'Not authorized'});
	}
	else{
		let sql = 'SELECT username, email, firstName, lastName, birthday, pizza, soda FROM ftduser WHERE username=$1';
		pool.query(sql, [urlUsername], (err, pgRes) => {
			if (err){
				res.status(403).json({ error: 'Not authorized'});
			} else if(pgRes.rowCount == 1){
				// return user data
				res.status(200).json(pgRes.rows);
			} else {
				// no rows
				res.status(404).json({error:'No user found'});
			}
		});
	}

});

app.put('/api/auth/users/:username', function (req, res) {
	try{
		var username = req.body.username;
		var password = req.body.password;
		var confirmPassword = req.body.confirmPassword;
		var email = req.body.email;
		var firstName = req.body.firstName;
		var lastName = req.body.lastName;
		var birthday = req.body.birthday;
		var pizza = req.body.pizza;
		var soda = req.body.soda;

		let m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
			
		let user_pass = Buffer.from(m[1], 'base64').toString();

		let temp = user_pass.split(':');
		let validationUsername = temp[0];

		if (username != validationUsername){
			res.status(403).json({ error: 'Not authorized'});
		}
		else{

			var errors = validateProfile(username, password, confirmPassword, email, firstName, lastName, birthday, pizza, soda);
			if (errors)throw new Error(errors);
			
			let sql = 'SELECT * FROM ftduser WHERE username=$1';
			pool.query(sql, [username], (err, pgRes) => {
				if (err){
					res.status(403).json({ error: 'Not authorized'});
				} else if(pgRes.rowCount == 1){
					
					// otherwise, update the profile
					let sql = 'UPDATE ftduser SET username=$1, password=sha512($2), email=$3, firstName=$4, lastName=$5, birthday=$6, pizza=$7, soda=$8 WHERE username=$1';
					pool.query(sql, [username, password, email, firstName, lastName, birthday, pizza, soda], (err, pgRes) => {
						if (err){
							res.status(403).json({ error: 'Not authorized'});
						} else {
							// updated profile
							res.status(200).json('Profile Updated');
						}
					});
					
				} else {
					res.status(404).json({ error: 'User does not exist'});
				}
			});
		}
	}
	catch(err){
		res.status(400).json(err.message);
	}
});

app.delete('/api/auth/users/:username', function (req, res) {

    let urlUsername = req.params.username;
	var m = /^Basic\s+(.*)$/.exec(req.headers.authorization);
		
	var user_pass = Buffer.from(m[1], 'base64').toString();

	var temp = user_pass.split(':');
	var validationUsername = temp[0];

	if (urlUsername != validationUsername){
		res.status(403).json({ error: 'Not authorized'});
	}
	else{		
		let sql = 'DELETE FROM ftduser WHERE username=$1';
		pool.query(sql, [urlUsername], (err, pgRes) => {
			if (err){
				res.status(403).json({ error: err.message});
			} else if(pgRes.rowCount == 1){
				// return user data
				res.status(200).json(pgRes.rows);
			} else {
				// no rows
				res.status(404).json({error:'No user found'});
			}
		});
	}

});

app.post('/api/auth/game', function (req, res) {
	try{

		var username = req.body.username;
		// check user exists
		let sql = 'SELECT * FROM ftduser WHERE username=$1';
		pool.query(sql, [username], (err, pgRes) => {
  			if (err){
					res.status(403).json({ error: 'Not authorized'});
			} else if(pgRes.rowCount == 1){
				// check valid score
				var score = req.body.score;
				if(!isNaturalNumber(score))res.status(400).json({ error: 'Score must be a number'});

				// check valid difficulty
				var difficulty;
				if(req.body.difficulty==0)difficulty='easy';
				else if(req.body.difficulty==1)difficulty='normal';
				else if(req.body.difficulty==2)difficulty='hard';
				else res.status(400).json({ error: 'Difficulty must be easy, normal, or hard'})
			
				// otherwise, insert game stats
				let sql = 'INSERT INTO ftdstats(username, score, difficulty, datePlayed) VALUES($1, $2, $3, now())';
				pool.query(sql, [username, score, difficulty], (err, pgRes) => {
					if (err){
						res.status(403).json({ error: 'Not authorized'});
					} else {
						// store game
						res.status(200).json('Score recorded');
					}
				});
				
			} else {
					res.status(404).json({ error: 'User does not exist'});
			}
		});
	}
	catch(err){
		res.status(400).json(err.message);
	}
});

app.use('/',express.static('static_content')); 

app.listen(port, function () {
  	console.log('Example app listening on port '+port);
});

