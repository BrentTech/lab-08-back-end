DROP TABLE weathers;
DROP TABLE restaurants;
DROP TABLE movies;
DROP TABLE trails;
DROP TABLE meetups;
DROP TABLE locations;




CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude NUMERIC(8, 6),
    longitude NUMERIC (9, 6)
  );

CREATE TABLE IF NOT EXISTS weathers (
    id SERIAL PRIMARY KEY,
    forecast VARCHAR(255),
    time VARCHAR(255),
    created_at BIGINT,
    location_id INTEGER NOT NULL REFERENCES locations(id)
  );

CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  url VARCHAR(255),
  rating FLOAT,
  price VARCHAR(10),
  image_url VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  released_on VARCHAR(255),
  average_votes FLOAT,
  total_votes INTEGER,
  image_url VARCHAR(255),
  overview VARCHAR(255),
  popularity FLOAT,
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS trails (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  location VARCHAR(255),
  length FLOAT,
  trail_url VARCHAR(255),
  condition_date VARCHAR(255),
  condition_time VARCHAR(255),
  conditions VARCHAR(255),
  stars INTEGER,
  star_votes INTEGER,
  summary VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE IF NOT EXISTS meetups (
  id SERIAL PRIMARY KEY,
  link VARCHAR(255),
  name VARCHAR(255),
  host VARCHAR(255),
  creation_date VARCHAR(255),
  created_at BIGINT,
  location_id INTEGER NOT NULL REFERENCES locations(id)
);