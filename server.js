/* eslint-disable indent */
'use strict';

//Application Dependencies
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const pg = require('pg');

//Load Environment Variables from the .env file
require ('dotenv').config();

//Application Setup
const PORT = process.env.PORT;
const app = express();
app.use(cors());

// Database configuration
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

//API route
app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/yelp', getYelp);
app.get('/movies', getMovies);
app.get('/trails', getTrails);
app.get('/meetups', getMeetup);

//make sure the server is listening for requests.
app.listen(PORT, () => console.log(`App is up on ${PORT}`));

//++++++++ Models ++++++++++

function Location(query, res) {
	this.tableName = 'locations';
	this.search_query = query;
	this.formatted_query = res.body.results[0].formatted_address;
	this.latitude = res.body.results[0].geometry.location.lat;
	this.longitude = res.body.results[0].geometry.location.lng;
	this.created_at = Date.now();
}

		//location lookup function with
Location.lookupLocation = (location) => {
	const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
	const values = [location.query];

	return client.query(SQL, values)
		.then(result => {
			if (result.rowCount > 0) {
				console.log('We have a match for location.');
				location.cacheHit(result);
			} else {
				console.log('We don\'t have a match for location.');
				location.cacheMiss();
			}
		})
		.catch(console.error);
}

Location.prototype = {
	save: function () {
		const SQL = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id;`;
		const values = [this.search_query, this.formatted_query, this.latitude, this.longitude];

		return client.query(SQL, values)
			.then(result => {
				this.id = result.rows[0].id;
				return this;
			});
	}
}


	//weather model
function Weather(day) {
	this.tableName = 'weathers';
	this.forecast = day.summary;
	this.time = new Date(day.time * 1000).toString().slice(0, 15);
	this.created_at = Date.now()
}

Weather.tableName = 'weathers';
Weather.lookup = lookup;
Weather.deleteByLocationId = deleteByLocationId;

Weather.prototype = {
	save: function (location_id) {
		const SQL = `INSERT INTO ${this.tableName} (forecast, time, created_at, location_id) VALUES ($1, $2, $3, $4);`;
		const values = [this.forecast, this.time, this.created_at, location_id];

		client.query(SQL, values);
	}
}

function Yelp(restaurant) {
	this.tableName = 'restaurants';
	this.url = restaurant.url;
	this.name = restaurant.name;
	this.rating = restaurant.rating;
	this.price = restaurant.price;
	this.image_url = restaurant.image_url;
	this.created_at = Date.now();
}

Yelp.tableName = 'restaurants';
Yelp.lookup = lookup;
Yelp.deleteByLocationId = deleteByLocationId;

Yelp.prototype = {
	save: function (location_id) {
		const SQL = `INSERT INTO ${this.tableName} (name, url, rating, price, image_url, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
		const values = [this.name, this.url, this.rating, this.price, this.image_url, this.created_at, location_id];

		client.query(SQL, values);
	}
}

function Movie(movie) {
	this.tableName = 'movies';
	this.title = movie.title;
	this.released_on = movie.release_date;
	this.average_votes = movie.vote_average;
	this.total_votes = movie.vote_count;
	this.image_url = `http://image.tmdb.org/t/p/w185/${movie.poster_path}`
	this.overview = movie.overview;
	this.popularity = movie.popularity;
	this.created_at = Date.now();
}

Movie.tableName = 'movies';
Movie.lookup = lookup;
Movie.deleteByLocationId = deleteByLocationId;

Movie.prototype = {
	save: function (location_id) {
		const SQL = `INSERT INTO ${this.tableName} (title, released_on, average_votes, total_votes, image_url, overview, popularity, created_at, location_id);`;
		const values = [this.title, this.released_on, this.average_votes, this.total_votes, this.image_url, this.overview, this.popularity, this.created_at, location_id];

		client.query(SQL, values);
	}
}

function Trail(trail) {
	this.trail_url = trail.url;
	this.name = trail.name;
	this.location = trail.location;
	this.length = trail.length;
	this.condition_date = trail.conditionDate.split(' ')[0];
	this.condition_time = trail.conditionDate.split(' ')[1];
	this.conditions = trail.conditionDetails;
	this.stars = trail.stars;
	this.star_votes = trail.starVotes;
	this.summary = trail.summary;
}

function Meetup(meetupResult) {
	this.link = meetupResult.link;
	this.name = meetupResult.name;
	this.host = meetupResult.group.name;
	this.creation_date = new Date(meetupResult.created).toString().slice(0, 15);
}

//++++++++++ Helper Functions ++++++++++++++
//These are assigned to properties on the models

function lookup(options) {
	const SQL = `SELECT * FROM ${options.tableName} WHERE location_id=$1;`;
	const values = [options.location];

	client.query(SQL, values)
		.then(result => {
			if (result.rowCount > 0) {
				options.cacheHit(result);
			} else {
				options.cacheMiss();
			}
		})
		.catch(error => handleError(error));
}

	//clears data if stale
function deleteByLocationId(table, city) {
	const SQL = `DELETE from ${table} WHERE location_id=${city};`;
	return client.query(SQL);
}


//++++++ Handlers +++++++++

//Error Handling
function handleError(err, res) {
	console.error(err);
	if (res) res.satus(500).send('Sorry, somthing went wrong');
}

function getLocation(request, response) {
	Location.lookupLocation({
		tableName: Location.tableName,
		query: request.query.data,
		cacheHit: function (result) {
			console.log(result.rows[0]);
			response.send(result.rows[0]);
		},
		cacheMiss: function () {
			const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${this.query}&key=${process.env.GEOCODE_API_KEY}`;

			return superagent.get(url)
			.then(res => {
				const location = new Location(this.query, res);
				location.save()
					.then(location => response.send(location));
			})
			.catch(error => handleError(error));		
		}
	})
}

function getWeather(request, response) {
	Weather.lookup({
		tableName: Weather.tableName,
		query: request.query.data,
		cacheHit: function (result) {
			let dataAgeInMinutes = (Date.now() - result.rows[0].created_at) / (1000 * 60);
			if (dataAgeInMinutes > 30) {
				Weather.deleteByLocationId(Weather.tableName, request.query.data.id);
				this.cacheMiss();
			} else {
				response.send(result.rows[0]);
			}
		},
		cacheMiss: function () {
			const url = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

			return superagent.get(url)
				.then(result => {
					const weatherSummaries = result.body.daily.data.map(day => {
						const summary = new Weather(day);
						summary.save(request.query.data.id);
						return summary;
					});
					response.send(weatherSummaries);
				})
				.catch(error => handleError(error, response));
			}
	})
}

function getYelp(request, response) {
	Yelp.lookup({
		tableName: Yelp.tableName,
		query: request.query.data,
		cacheHit: function (result) {
			let dataAgeInDays = (Date.now() - result.rows[0].created_at) / (1000 * 60 * 60 * 24);
			if (dataAgeInDays > 14) {
				Yelp.deleteByLocationId(Yelp.tableName, request.query.data.id);
				this.cacheMiss();
			} else {
				response.send(result.rows[0]);
			}
		},
		cacheMiss: function () {
			const url = `https://api.yelp.com/v3/businesses/search?term=restaurants&latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`;

			return superagent.get(url)
				.set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
				.then( result => {
					const yelpBusinesses = result.body.businesses.map(restaurant => {
						const yelpRestaurant = new Yelp(restaurant);
						yelpRestaurant.save(request.query.data.id);
						return yelpRestaurant;
					});
				response.send(yelpBusinesses);
				})
				.catch(error => handleError(error, response));
		}
	})
}

function getMovies(request, response) {
	Movie.lookup({
		tableName: Movie.tableName,
		query: request.query.data,
		cacheHit: function (result) {
			let dataAgeInDays = (Date.now() - result.rows[0].created_at) / (1000 * 60 * 60 * 24);
			if (dataAgeInDays > 30) {
				Movie.deleteByLocationId(Movie.tableName, request.query.data.id);
				this.cacheMiss();
			} else {
				response.send(result.rows[0]);
			}
		},
		cacheMiss: function () {
			const url = `https://api.themoviedb.org/3/search/movie?query=${request.query.data.search_query}&api_key=${process.env.MOVIEDB_API_KEY}`
			return superagent.get(url)
				.then(result => {
					const movieSet = result.body.results.map( movie => {
						const newMovie = new Movie(movie);
						newMovie.save(request.query.data.id);
						return newMovie;
					});
				response.send(movieSet);
				})
				.catch(error => handleError(error, response));
		}
	})
}

function getTrails(request, response) {
	const url = `https://www.hikingproject.com/data/get-trails?lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&key=${process.env.TRAILS_API_KEY}`;
	superagent.get(url)
	.then(result => {
		const trailList = result.body.trails.map( trail => {
			return new Trail(trail);
		});
		response.send(trailList);
	})
	.catch(error => handleError(error, response));
}

function getMeetup(request, response) {
	const url = `http://api.meetup.com/find/upcoming_events?lon=${request.query.data.longitude}&page=20&lat=${request.query.data.latitude}&key=${process.env.MEETUP_API_KEY}`;
	superagent.get(url)
	.then(result => {
		const meetupList = result.body.events.map( meet => {
			return new Meetup(meet);
		});
		response.send(meetupList);
	})
	.catch(error => handleError(error, response));
}
