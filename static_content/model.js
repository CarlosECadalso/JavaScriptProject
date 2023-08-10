function randint(n){ return Math.round(Math.random()*n); }
function rand(n){ return Math.random()*n; }
function randrange(min, max){return Math.floor(Math.random() * (max - min) + min);}
function round5(x){return (x % 5) >= 2.5 ? parseInt(x / 5) * 5 + 5 : parseInt(x / 5) * 5;}

// Setup major vars used in the code
var maxSpeed = 7;
var mapSizeMultiplier = 2;
var mapSizeAddition = 300;
var startingHp = 10;
var startingAmmo = 30;

var enemyHp = [1, 5, 10];

var enemyAccuracyOffset = [10, 20, 30];

var enemyAmmount = [5, 10, 15];

var enemyFireRate = [20, 15, 10];

var shrinkRate = [0.1, 0.5, 1]

var waveIncrease = [2, 5, 10]

class Stage {
	constructor(canvas, difficulty){
		this.difficulty = difficulty;
		this.canvas = canvas;

		this.isPaused = true;
		//set initial score
		this.setScore(0);

		this.actors=[]; // all actors on this stage (monsters, player, boxes, ...)
		this.killables=[]; //all enemies on this stage
		this.player=null; // a special actor, the player

		//Set initial factors based on difficulty
		this.enemyHp = enemyHp[difficulty];
		this.enemyAccuracyOffset = enemyAccuracyOffset[difficulty];
		this.enemyFireRate = enemyFireRate[difficulty];
		this.areaShrinkRate = shrinkRate[difficulty];
		this.waveIncreaseRate = waveIncrease[difficulty];
		this.wave = 1;
		this.enemyAmmount = enemyAmmount[difficulty]; 

		// the logical width and height of the stage
		this.width=canvas.width + mapSizeAddition;
		this.height=canvas.height + mapSizeAddition;

		// Set up the area that does NOT hurt the player
		this.topLeftCornerX = 0;
		this.topLeftCornerY = 0;
		this.goodAreaWidth = this.width;
		this.goodAreaHeight = this.height;

		//Setup game over
		this.isGameOver = false;

		// Add the player to the center of the stage
		var velocity = new Pair(0,0);
		var radius = 20;
		var colour= 'rgba(0,0,0,1)';
		this.startingPosition = new Pair(Math.floor(this.width/2), Math.floor(this.height/2));
		this.addPlayer(new Player(this, this.startingPosition, velocity, colour, radius));

		this.spawnStartingEnemies(); //Spawn enemies

		this.spawnObstacles(); //Spawn obstacles

		// Add 1 ammo crate in each of the four quadrants of the map (randomly) 
		this.spawnAmmo(this.width, this.height);
	}

	// Add the player to the game
	addPlayer(player){
		this.addActor(player);
		this.player=player;
	}
	
	// Add an enemy to the game
	addEnemy(enemy){
		this.addActor(enemy);
		this.killables.push(enemy);
	}

	// Remove the player to the game
	removePlayer(){
		this.removeActor(this.player);
		this.player=null;
	}

	// Add a bullet to the game
	addBullet(origin, velocity){
		if(origin.ammo > 0){
			origin.useBullet();
			var x=origin.x+(origin.radius/2); 
			var y=origin.y+(origin.radius/2); 
			var radius=5;
			var colour= 'rgba(0,0,0,1)';
			var position = new Pair(x,y);
			
			var b = new Bullet(this, position, velocity, colour, radius, origin);
			this.addActor(b);
		}
	}

	// Add an actor to the game
	addActor(actor){
		this.actors.push(actor);
	}

	// Remove an actor to the game
	removeActor(actor){
		var index=this.actors.indexOf(actor);
		if(index!=-1){
			this.actors.splice(index,1);
		}
	}

	// Remove a killable actor from the game
	removeKillable(actor){
		var index=this.killables.indexOf(actor);
		if(index!=-1){
			this.killables.splice(index,1);
		}
	}

	// Take one step in the animation of the game.  Do this by asking each of the actors to take a single step. 
	// NOTE: Careful if an actor died, this may break!
	step(){
		if (!this.isPaused){
			this.topLeftCornerX += this.areaShrinkRate;
			this.topLeftCornerY += this.areaShrinkRate;
			this.goodAreaHeight -= this.areaShrinkRate * 2;
			this.goodAreaWidth -= this.areaShrinkRate * 2;
		}

		for(var i=0;i<this.actors.length;i++){
			if (!this.isPaused){
				this.actors[i].step();	
			}

			if (this.killables.length == 0){
				this.startNextWave();
			}
		}

	}

	// Spawn enemies for the next wave
	startNextWave(){
		this.spawnEnemies(this.enemyAmmount + this.waveIncreaseRate*this.wave);
		this.wave = this.wave + 1;
		document.getElementById("wave").innerText = this.wave;
	}

	draw(){
		// Get the info from the game
		var context = this.canvas.getContext('2d');

		var intTopLeftCornerX = Math.floor(this.topLeftCornerX);
		var intTopLeftCornerY = Math.floor(this.topLeftCornerY);

		var intGoodAreaWidth = Math.floor(this.goodAreaWidth); 
		var intGoodAreaHeight = Math.floor(this.goodAreaHeight);

		//Update the player camera
		if(this.player!=null)this.updateCanvasOffset(this.player.position);

		// Draw the storm (damaging area)
		context.fillStyle= "#D739E1";
		context.fillRect(0, 0, this.width, this.height);
		context.clearRect(intTopLeftCornerX, intTopLeftCornerY, intGoodAreaWidth, intGoodAreaHeight);

		// Draw all the actors
		for(var i=0;i<this.actors.length;i++){
			this.actors[i].draw(context);
		}		
	}	
		

	// return the first actor at coordinates (x,y) return null if there is no such actor
	getActor(x, y){
		for(var i=0;i<this.actors.length;i++){
			if(this.actors[i].x==x && this.actors[i].y==y){
				return this.actors[i];
			}
		}
		return null;
	}

	// Deal dmg to an actor
	takeDamage(origin, target, dmgTaken){
		if(target.hp > 0){
			target.hp -= dmgTaken;
			if(target instanceof Enemy){
				if(this.actors.indexOf(origin)===this.actors.indexOf(this.player)){
					target.hitByPlayer=true;
				}
				else target.hitByPlayer=false;
			}
		}
	}		
	
	
	// Make the canvas follow the player
	updateCanvasOffset(position){
		var context = this.canvas.getContext('2d');
		context.restore();

		context.save();

		var canvasXPosRelativeToPlayer = position.x-(this.canvas.width/2);
		var canvasYPosRelativeToPlayer = position.y-(this.canvas.height/2);

		if(canvasXPosRelativeToPlayer <=0)canvasXPosRelativeToPlayer=0;
		if(canvasXPosRelativeToPlayer + this.canvas.width>this.width)canvasXPosRelativeToPlayer=this.width - this.canvas.width;
		if(canvasYPosRelativeToPlayer <=0)canvasYPosRelativeToPlayer=0;
		if(canvasYPosRelativeToPlayer + this.canvas.height > this.height)canvasYPosRelativeToPlayer= this.height - this.canvas.height;

		context.translate(-canvasXPosRelativeToPlayer, -canvasYPosRelativeToPlayer);
	}

	// Place ammo crates around map
	spawnAmmo(width, height){
		var middlex = width/2;
		var middley = height/2;
		var total=0;
		while(total<4){
			// top-left: 0 <= x <= middlex && 0 <= y <= middley
			if(total==0){
				var x=Math.floor( (Math.random()*(middlex-20)) +10 ); 
				var y=Math.floor( (Math.random()*(middley-20)) +10); 
			}
			// top-right: middlex <= x <= width && 0 <= y <= middley
			else if(total==1){
				var x=Math.floor( (Math.random()*(middlex-20)) + middlex - 10 ); 
				var y=Math.floor( (Math.random()*(middley-20)) +10 ); 
			}
			// bottom-left: 0 <= x <= middlex && middley <= y <= height
			else if(total==2){
				var x=Math.floor( (Math.random()*(middlex-20)) +10 ); 
				var y=Math.floor( (Math.random()*(middley-20)) + middley -10 ); 
			}
			// bottom-right: middlex <= x <= width && middley <= y <= height
			else if (total==3){
				var x=Math.floor( (Math.random()*(middlex-20)) + middlex - 10); 
				var y=Math.floor( (Math.random()*(middley-20)) + middley - 10);
			}
			// Place crate

			var radius = 40;
			var colour= 'rgba(100, 90, 80, 1)';
			var position = new Pair(round5(x),round5(y));

			var crate = new Ammo(this, position, colour, radius, radius, 0);
			if(this.collisions(crate).length===0 && this.inBounds(crate)){
				this.addActor(crate);
				total++;
			}
		}
	}
	
	// get coordinates of closest actor within radius
	getAmmoCrate(radius){
		var playerX = this.player.x;
		var playerY = this.player.y;
		
		for(var i=0;i<this.actors.length;i++){

			if(this.actors[i] instanceof Ammo){
				if(this.actors[i].x-radius <= playerX+this.player.radius && playerX <= this.actors[i].x+this.actors[i].width+radius){
					if(this.actors[i].y-radius <= playerY+this.player.radius && playerY <= this.actors[i].y+this.actors[i].width+radius){
						return this.actors[i];
					}
				}
			}

		}
		return null;
	}

	// Spawn the obstacles
	spawnObstacles(){
		var total=10;
		while(total>0){
			// round coordinates to nearest 5
			var x=round5(Math.floor((Math.random()*this.width))); 
			var y=round5(Math.floor((Math.random()*this.height)));
			var w = round5(randrange(100, 300));
			var h = round5(randrange(100, 200));
			var red=randint(255), green=randint(255), blue=randint(255);
			var colour= 'rgba('+red+','+green+','+blue+','+1+')';
			var position = new Pair(x,y);

			var o = new Obstacle(this, position, colour, w, h, 5);
			if(this.collisions(o).length===0 && this.inBounds(o)){
				this.addActor(o);
				total--;
			}
		}
	}
		
	// Adds enemies to the game around the map
	spawnStartingEnemies(){
		this.spawnEnemies(this.enemyAmmount);
	}

	//Spawn the enemies
	spawnEnemies(ammount){
		var total=ammount;
		while(total>0){
			// round coordinates to nearest 5
			var velocity = new Pair(0,0);
			var radius = 20;
			var x=round5(Math.floor((Math.random()*this.width))); 
			var y=round5(Math.floor((Math.random()*this.height)));
			var startingPosition = new Pair(x,y);
			var colour;
			var e = null;
			switch (randint(5)){
				case 1:
					// Brave Enemies will be red
					colour= 'rgba(255,0,0,1)';
					e = new BraveEnemy(this, startingPosition, velocity, colour, radius)
					break;
				case 2:
					// Careful Enemies will be green
					colour= 'rgba(0,255,0,1)';
					e = new CarefulEnemy(this, startingPosition, velocity, colour, radius)
					break;
				case 3:
					// Fast Shooter enemies will be purple
					colour= 'rgba(255,0,255,1)';
					e = new FastShooterEnemy(this, startingPosition, velocity, colour, radius)
					break;
				case 4:
					// Drunk enemies will be orange
					colour= 'rgba(255,179,25,1)';
					e = new DrunkEnemy(this, startingPosition, velocity, colour, radius)
					break;
			}

			// Do not count the enemies if they collide or do not exist
			if(e && this.collisions(e).length===0 && this.inBounds(e)){
				this.addEnemy(e);
				total--;
			}
			
		}
	}

	// Check how many objects collide with actor
	collisions(actor){
		var overlapping = [];
		
		// check if any other actors collide
		for(var i=0;i<this.actors.length;i++){
			if(this.collidesActors(actor, this.actors[i]))overlapping.push(this.actors[i]);
		}
		return overlapping;
	}

	// check collision between actor 'a' and other 'o'
	collidesActors(a, o){
		// if comparing actor to itself, return false
		if (this.actors.indexOf(a)==this.actors.indexOf(o))return false;

		// set l,w depending on type of actor
		if (a instanceof Obstacle || a instanceof Ammo){var aWidth = a.width;var aHeight = a.height;}
		else if (a instanceof Bullet || a instanceof Player){var aWidth = a.radius;var aHeight = a.radius;}
		
		// set l,w depending on type of other
		if(o instanceof Obstacle || o instanceof Ammo){var oWidth = o.width;var oHeight = o.height;}
		else if(o instanceof Bullet || o instanceof Player){var oWidth = o.radius;var oHeight = o.radius;}

		if (a.x && o.x && oWidth && aWidth && a.y && o.y && oHeight && aHeight){
			return (a.x <= o.x + oWidth &&
				a.x + aWidth >= o.x &&
				a.y <= o.y + oHeight &&
				a.y + aHeight >= o.y);
		} else {
			return false;
		}

		
	}

	// check collision between 
	collidesCoords(ax, ay, aw, ah, bx, by, bw, bh){
		return ax <= bx + bw &&
			   ax + aw >= bx &&
			   ay <= by + bh &&
			   ay + ah >= by;
	}

	// Check if an actor is in bounds
	inBounds(actor){
		if (actor instanceof Obstacle || actor instanceof Ammo){var aWidth = actor.width;var aHeight = actor.height;}
		else if (actor instanceof Bullet){var aWidth = actor.radius;var aHeight = actor.radius;}
		else if (actor instanceof Ball){var aWidth = actor.radius;var aHeight = actor.radius;}

		return 0 <= actor.x && actor.x+aWidth <= this.width &&
			   0 <= actor.y && actor.y+aHeight <= this.height;
	}

	// Check if an actor is in the damaging area
	inGoodArea(actor){
		var intTopLeftCornerX = Math.floor(this.topLeftCornerX);
		var intTopLeftCornerY = Math.floor(this.topLeftCornerY);
		var intGoodAreaWidth = Math.floor(this.goodAreaWidth) + intTopLeftCornerX; 
		var intGoodAreaHeight = Math.floor(this.goodAreaHeight) + intTopLeftCornerX;

		if (actor instanceof Ball){
			var aWidth = actor.radius;var aHeight = actor.radius;
			return intTopLeftCornerX <= actor.x && actor.x+aWidth <= intGoodAreaWidth && intTopLeftCornerY <= actor.y && actor.y+aHeight <= intGoodAreaHeight;
		}
		return true;
  }
  
  	// Set the player's score
	setScore(amount){
		this.score=amount;
		document.getElementById("score").innerText = this.score;
	}
	
} // End Class Stage


class Pair {
	constructor(x,y){
		this.x=x; this.y=y;
	}
	
	toString(){
		return "("+this.x+","+this.y+")";
	}

	normalize(){
		var magnitude=Math.sqrt(this.x*this.x+this.y*this.y);
		this.x=this.x/magnitude;
		this.y=this.y/magnitude;
	}

	// Copies cordinates from position1 to position2
	copy(position){
		this.x = position.x;
		this.y = position.y;
	}
}

// Base class used for the player and enemies
class Ball {
	constructor(stage, position, velocity, colour, radius){
		this.stage = stage;
		this.position=position;
		this.x = position.x;
		this.y = position.y;
		this.intPosition(); // this.x, this.y are int version of this.position
		this.velocity=velocity;
		this.colour = colour;
		this.radius = radius;
	}
	
	headTo(position){
		this.velocity.x=(position.x-this.position.x);
		this.velocity.y=(position.y-this.position.y);
		this.velocity.normalize();
	}

	toString(){
		return this.position.toString() + " " + this.velocity.toString();
	}

	step(){
		this.position.x=this.position.x+this.velocity.x;
		this.position.y=this.position.y+this.velocity.y;
			
		// bounce off the walls
		if(this.position.x<0){
			this.position.x=0;
			this.velocity.x=Math.abs(this.velocity.x);
		}
		if(this.position.x>this.stage.width){
			this.position.x=this.stage.width;
			this.velocity.x= -Math.abs(this.velocity.x);
		}
		if(this.position.y<0){
			this.position.y=0;
			this.velocity.y=Math.abs(this.velocity.y);
		}
		if(this.position.y>this.stage.height){
			this.position.y=this.stage.height;
			this.velocity.y= -Math.abs(this.velocity.y);
		}
		this.intPosition();
	}

	intPosition(){
		this.x = Math.round(this.position.x);
		this.y = Math.round(this.position.y);
	}

	draw(context){
		context.fillStyle = this.colour;
		context.beginPath(); 
		context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false); 
		context.fill();   
	}
}

// The player class
class Player extends Ball {
	constructor(stage, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);
		this.isDead = false;

		// angle
		this.rotation=0;

		// mouse position
		this.mx=0; this.my=0;

		// center of canvas window
		this.cx=this.x-150; this.cy=this.y-150;

		this.ammo=startingAmmo;
		this.ammoBar=document.getElementById("ammo_bar");
		this.ammoBar.value = this.ammo;

		this.hp=10;
		this.hpBar=document.getElementById("health_bar");
		this.hpBar.value = this.hp;

	}

	toString(){
		return 'Player: '+this.position.toString();
	}

	draw(context){
		// rotate shape, restore canvas origin after rotation
		context.save();
		context.beginPath();
		context.translate(this.x+(this.radius/2), this.y+(this.radius/2));
		context.rotate(this.rotation); //Rotate based on mouse position
		context.translate(-this.x-(this.radius/2), -this.y-(this.radius/2)); // move origin to center
		context.fillStyle = this.colour;
   		context.fillRect(this.x, this.y, this.radius,this.radius);
		context.stroke();
		context.closePath();
		context.restore(); // reset the canvas rotation
	}


	mapCollision(){
		// stop at walls
		if(this.position.x <=0){

			this.velocity.x=Math.max(0, this.velocity.x);
			
		} else if (this.position.x+(this.radius/2)>=this.stage.width){
			this.velocity.x=Math.min(0, this.velocity.x);
		}

		if(this.position.y <0){
			this.velocity.y=Math.max(0, this.velocity.y);
		} else if (this.position.y+(this.radius/2)>=this.stage.height){
			this.velocity.y=Math.min(0, this.velocity.y);
		}
	}

	obstacleCollision(){
		var obstacles = this.stage.collisions(this);
		if(obstacles.length>0){
			for(var i=0; i<obstacles.length;i++){
				var c = obstacles[i];

				// obtacle left/right of player

				if(this.position.x < c.x+c.width+this.radius && (this.y < c.y+c.height) && (this.y+this.radius > c.y)){
					var nextX = this.x+(this.velocity.x*2.5); // *2.5 accounts for acceleration
					if(this.stage.collidesCoords(nextX, this.y, this.radius, this.radius, c.x, c.y, c.width, c.height)){
						this.velocity.x=0;
					}
				}
				// obstacle below/above player
				if(this.position.y < c.y+c.height+this.radius && (this.x < c.x+c.width) && (this.x+this.radius > c.x)){
					var nextY = this.y+(this.velocity.y*2.5); // *2.5 accounts for acceleration
					if(this.stage.collidesCoords(this.x, nextY, this.radius, this.radius, c.x, c.y, c.width, c.height)){
						this.velocity.y=0;
					}
				}
			}
		}
	}


	move(){
		// cap speed
		this.velocity.x = cap(this.velocity.x, maxSpeed);
		this.velocity.y = cap(this.velocity.y, maxSpeed);

		// update position
		this.position.x=this.position.x+this.velocity.x;
		this.position.y=this.position.y+this.velocity.y;
		

	}
	
	step(){
		// update health bar
		if (!this.stage.inGoodArea(this)){
			this.hp -= 1;
		}

		this.hpBar.value = this.hp;
		
		// stop at walls
		this.mapCollision();
		
		// stop player at obstacles
		this.obstacleCollision();
		
		// update position
		this.move();
		
		if (this.hp <= 0){
			this.die();
		}

		this.intPosition();

	}

	// Speed up the player so it can move
	speedUp(additionalSpeed){
		var newXVelocity = cap(this.velocity.x + additionalSpeed.x, maxSpeed);
		var newYVelocity = cap(this.velocity.y + additionalSpeed.y, maxSpeed);

		this.velocity.x = newXVelocity;
		this.velocity.y = newYVelocity;

	}

	// Stop the player completelly
	stop(){
		this.stopH();
		this.stopV();
	}

	// Stop the player's horizontal movement
	stopH(){
		this.velocity.x = 0;
	}

	// Stop the player's vertical movement
	stopV(){
		this.velocity.y = 0;
	}

	// Kill the player
	die(){
		this.stage.isPaused = true;
		this.stage.isGameOver = true;
		this.isDead = true;
	}

	setHp(value){
		this.hp = value;
		this.hpBar.value = value;
	}

	setAmmo(value){
		this.ammo = value;
		this.ammoBar.value = value;
	}

	pickupAmmo(crate){
		this.stage.removeActor(crate);
		this.setAmmo(this.ammo+10);
	}

	useBullet(){
		this.setAmmo(this.ammo-1);
	}
}

// Bullet class
class Bullet extends Ball {
	constructor(stage, position, velocity, colour, radius, origin){
		super(stage, position, velocity, colour, radius);

		this.velocity.normalize();
		this.velocity.x*=10;
		this.velocity.y*=10;

		// player who used bullet
		this.origin = origin;
		// number of step() calls the bullet lives for
		this.lifespan=50;
	}

	toString(){
		return 'Bullet: '+this.position.toString();
	}

	step(){
		// bullet range
		this.lifespan-=1;
		if(this.lifespan==0){
			this.stage.removeActor(this);
		}
		this.position.x=this.position.x+this.velocity.x;
		this.position.y=this.position.y+this.velocity.y;
			
		// bullet deletion
		if(this.position.x<0){
			this.stage.removeActor(this);
		}
		if(this.position.x>this.stage.width){
			this.stage.removeActor(this);
		}
		if(this.position.y<0){
			this.stage.removeActor(this);
		}
		if(this.position.y>this.stage.height){
			this.stage.removeActor(this);
		}

		// stop bullet at obstacles
		var obstacles = this.stage.collisions(this);
		if(obstacles.length>0){
			var c = obstacles[0]; // get first obstacle that bullet hits

			// check bullet came from other player && ignore other bullets
			if ( this.stage.actors.indexOf(c) != this.stage.actors.indexOf(this.origin) && !(c instanceof Bullet)){
				this.stage.removeActor(this);
				this.stage.takeDamage(this.origin, c, 1);
			}
			
		}


		this.intPosition();
	}

}

// Stationary obstacles in the world
class Obstacle {
	constructor(stage, position, colour, width, height){
		this.stage = stage;
		this.position=position;
		this.intPosition(); // this.x, this.y are int version of this.position

		this.colour = colour;
		this.width = width;
		this.height = height;

		// hp is based on size of obstacle
		this.hp=Math.round((this.width+this.height)/25);
	}
	
	step(){
		if(this.hp <= 0){
			this.stage.removeActor(this);
		}
	}

	toString(){
		return this.position.toString();
	}

	intPosition(){
		this.x = Math.round(this.position.x);
		this.y = Math.round(this.position.y);
	}

	draw(context){
		context.fillStyle = this.colour;
   		context.fillRect(this.x, this.y, this.width,this.height);
	}
}


// Ammo crate that player can pick up
class Ammo extends Obstacle{
	constructor(stage, position, colour, width, height){
		super(stage, position, colour, width, height);
		this.hp = -1; // design: indestructible - can only be picked up by player
	}

	toString(){
		return 'Ammo: '+this.position.toString();
	}

	step(){} // unbreakable -- does not lose hp

	draw(context){
		context.fillStyle = this.colour;
   		context.fillRect(this.x, this.y, this.width,this.height);
	}
}

// Enemy class
class Enemy extends Player { // It extends player for future multiplayer functionality
	constructor(stage, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);
		this.velocity.normalize();

		// Enemies only go after the player. Because they will never go to refil their ammo, they 
		this.hp = this.stage.enemyHp;
		this.ammo = 10;  
		this.AIfactor = 1;

		this.distanceFromPlayer = this.stage.player.radius;
		this.hitByPlayer=false;


		// number of step() calls before shooting a bullet
		this.fireRate=randint(this.stage.enemyFireRate);
		this.resetRate=this.stage.enemyFireRate;
		this.target = this.stage.player;
	}

	toString(){
		return 'Enemy: '+this.position.toString();
	}

	// Remanent of an old AI vs AI feature
	searchForTarget(){
		this.setActor(this.stage.player);
	}

	setActor(actor){
		if (actor){
			this.target = actor;
		}
	}

	step(){
		// Remanent of an old AI vs AI feature
		if (!(this.target) || this.target.hp < 1 || this.target.isDead){
			this.searchForTarget();
		}

		// Get dmged while in the dmging area
		if (!this.stage.inGoodArea(this)){
			this.hp -= 1;
		}

		// goes after the player 
		if(this.target != null && this.target.hp > 0 && !this.target.isDead){
			if (this.target.position.x+this.distanceFromTarget < this.position.x){
				this.velocity.x = -maxSpeed * this.AIfactor;
			} 
			else if (this.target.position.x-this.distanceFromTarget > this.position.x){
				this.velocity.x = maxSpeed * this.AIfactor;
			} else this.velocity.x = 0;
			
			if (this.target.position.y+this.distanceFromTarget < this.position.y){
				this.velocity.y = -maxSpeed * this.AIfactor;
			}
			else if (this.target.position.y-this.distanceFromTarget > this.position.y){
				this.velocity.y = maxSpeed * this.AIfactor;
			} else this.velocity.y = 0;

			if (this.fireRate > 0){
				this.fireRate = this.fireRate - 1;
			} else {
				this.shoot();
				this.fireRate = this.resetRate;
			}
		}

		//movement is the same as the player
		this.mapCollision();
		this.obstacleCollision();
		this.move();

		// HANDLE death
		if(this.hp <= 0){
			this.die();
		}

		this.intPosition();

		this.stop();

	}

	// Kill enemy
	die(){
		this.isDead = true;
		this.stage.removeActor(this);
		this.stage.removeKillable(this);
    if(this.hitByPlayer)this.stage.setScore(this.stage.score+10);
		if (this.stage.difficulty > 2){
			this.respawn();
		}
	}

	// Spawn 1 enemy if this one dies
	respawn(){
		spawnEnemies(1);
	}

	setAmmo(value){
		this.ammo = 10;
	}

	shoot(){
        // mouse is in canvas, set bullet direction
		this.aim();
		var angle=this.rotation;
		
		var vx=Math.cos(angle);
		var vy=Math.sin(angle);
		var velocity=new Pair(vx, vy);
		this.stage.addBullet(this, velocity);

	}

	//This aim function repeats code from the controller mouseClick handler. This could be reworked to be generic and make the mouseClick call it
	aim(){
		if(this.target != null && this.target.hp > 1 && !this.target.isDead){
			var px = this.target.position.x;
			var py = this.target.position.y;
			var offsetX = randint(this.stage.enemyAccuracyOffset);
			var offsetY = randint(this.stage.enemyAccuracyOffset);
			if (rand(10) >= 5){
				offsetX = offsetX * (0-1);
				offsetY = offsetY * (0-1);
			}
			// mouse is in canvas, update player direction
			this.rotation = Math.atan2(py-this.position.y - offsetY, px-this.position.x - offsetX);
		}
	}
}

// The following are the different kinds of AI that are used

// Brave enemies get close to the player
class BraveEnemy extends Enemy {
	constructor(stage, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);

		this.AIfactor = 1;
	}

	setActor(actor){
		if (actor && ((this.target && this.target.isDead) || (!this.target))){
			this.target = actor;
		}
	}
}

// Careful enemies keep at a distance while shooting
class CarefulEnemy extends Enemy {
	constructor(stage, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);

		this.AIfactor = 1;
		this.distanceFromTarget = this.stage.player.radius * 5;
	}

	setActor(actor){
		if (actor){
			this.target = actor;
		}
	}
}

// Fast shooters get closer than other enemies and stay at a distance between brave and carfeul enemies
class FastShooterEnemy extends Enemy {
	constructor(stage, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);

		this.AIfactor = 1;
		this.distanceFromTarget = this.stage.player.radius * 3;
		this.fireRate=randint(this.stage.enemyFireRate/2);
		this.resetRate=this.stage.enemyFireRate/2;
	}

	setActor(actor){
		if (actor && ((this.target && this.target.isDead) || (!this.target))){
			this.target = actor;
		}
	}
}

// They have no fucking clue what's going on
class DrunkEnemy extends Enemy {
	constructor(stage, position, velocity, colour, radius){
		super(stage, position, velocity, colour, radius);
		this.AIfactor = rand(1);
		this.distanceFromTarget = this.stage.player.radius * 3;
	}	

	aim(){
        this.rotation = Math.atan2(randint(this.stage.height), randint(this.stage.width));
	}

	step(){
		// bounce off the walls
		if(this.position.x<=0 || this.position.x>=this.stage.width
			|| this.position.y<=0 || this.position.y>=this.stage.height){
			this.AIfactor = rand(1);
		}

		super.step();
		
	}

	setActor(actor){
		if (actor && randint(2) < 1){
			this.target = actor;
		}
	}
}

// Caps a number both in the possitive and negative side.
function cap(number, cap){
	if (number < 0){
		return Math.max(number, -cap);
	} else if (number > 0){
		return Math.min(number, cap);
	} else {
		return 0;
	}
}


