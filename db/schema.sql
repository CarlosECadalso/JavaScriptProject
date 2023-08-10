--- load with 
--- psql "dbname='webdb' user='webdbuser' password='password' host='localhost'" -f schema.sql
DROP TABLE IF EXISTS ftduser CASCADE;
CREATE TABLE ftduser (
	username VARCHAR PRIMARY KEY,
	password BYTEA NOT NULL,
	email VARCHAR NOT NULL,
	firstName VARCHAR NOT NULL,
	lastName VARCHAR NOT NULL,
	birthday VARCHAR NOT NULL,
	pizza VARCHAR NOT NULL,
	soda VARCHAR NOT NULL
);
--- Could have also stored as 128 character hex encoded values
--- select char_length(encode(sha512('abc'), 'hex')); --- returns 128

DROP TABLE IF EXISTS ftdstats;
CREATE TABLE ftdstats (
	username VARCHAR,
	score INTEGER,
	difficulty VARCHAR,
	datePlayed TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (username, datePlayed),
	CONSTRAINT fk_username 
		FOREIGN KEY (username) 
		REFERENCES ftduser(username) 
		ON DELETE CASCADE
);

INSERT INTO ftduser VALUES('user1', sha512('password1'), 'user1@mail.com', 'bob', 'marley', '2000-03-21', 'yes', 'Coca Cola');
INSERT INTO ftduser VALUES('user2', sha512('password2'), 'user2@mail.com', 'john', 'smith', '1999-04-20', 'no', 'Fanta');
