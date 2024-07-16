document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
    const movieTitleInput = document.getElementById('movie-title');
    const actorDirectorInput = document.getElementById('actor-director');
    const genreInput = document.getElementById('genre');
    const results = document.getElementById('results');

    searchButton.addEventListener('click', async () => {
        const movieTitle = movieTitleInput.value.trim();
        const actorDirector = actorDirectorInput.value.trim();
        const genre = genreInput.value.trim();

        if (!movieTitle && !actorDirector && !genre) {
            results.innerHTML = '<p>Please enter a search term.</p>';
            results.style.display = 'block';
            return;
        }

        results.innerHTML = '<p>Loading...</p>';
        results.style.display = 'block';

        try {
            const movies = await fetchMovies(movieTitle, actorDirector, genre);
            displayResults(movies);
        } catch (error) {
            results.innerHTML = '<p>Error loading results. Please try again.</p>';
            results.style.display = 'block';
            console.error(error);
        }
    });
});

// Fetch movies based on title, actors and/or director, genre
async function fetchMovies(movieTitle, actorDirector, genre) {
    const apiKey = 'e01f8d6a7e3e0c88860d8edf5159508b'; // TMDB API key
    let movieResults = [];

    // Fetch movies by title
    if (movieTitle) {
        const movieTitleResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(movieTitle)}`);
        const movieTitleData = await movieTitleResponse.json();
        movieResults = movieTitleData.results || [];
    }

    // Fetch movies by actor/s and director
    if (actorDirector) {
        const actorDirectorKeywords = actorDirector.split(',').map(p => p.trim());
        for (const person of actorDirectorKeywords) {
            const personResponse = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(person)}`);
            const personData = await personResponse.json();
            if (personData.results && personData.results.length > 0) {
                for (const personResult of personData.results) {
                    const personMoviesResponse = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_cast=${personResult.id}`);
                    const personMoviesData = await personMoviesResponse.json();
                    movieResults = movieResults.concat(personMoviesData.results || []);
                }
            }
        }
    }

    // Fetch movies by genre
    if (genre) {
        const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`);
        const genreData = await genreResponse.json();
        const genreId = genreData.genres.find(g => g.name.toLowerCase() === genre.toLowerCase())?.id;
        if (genreId) {
            const genreMoviesResponse = await fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_genres=${genreId}`);
            const genreMoviesData = await genreMoviesResponse.json();
            movieResults = movieResults.concat(genreMoviesData.results || []);
        }
    }
    
    // Remove duplicate movies based on movie ID
    movieResults = Array.from(new Set(movieResults.map(movie => movie.id))).map(id => movieResults.find(movie => movie.id === id));

    // Fetch credits for each movie (for actors and director)
    movieResults = await Promise.all(movieResults.map(async (movie) => {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${apiKey}`);
        const credits = await response.json();
        return { ...movie, credits };
    }));

    // Filter out movies that don't match all criteria
    if (movieTitle) {
        movieResults = movieResults.filter(movie => movie.title.toLowerCase().includes(movieTitle.toLowerCase()));
    }

    if (actorDirector) {
        const actorDirectorKeywords = actorDirector.split(',').map(p => p.trim().toLowerCase());
        movieResults = movieResults.filter(movie => {
            return actorDirectorKeywords.every(keyword => movie.credits.cast.some(cast => cast.name.toLowerCase().includes(keyword)) ||
                movie.credits.crew.some(crew => crew.name.toLowerCase().includes(keyword)));
        });
    }

    if (genre) {
        const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`);
        const genreData = await genreResponse.json();
        const genreId = genreData.genres.find(g => g.name.toLowerCase() === genre.toLowerCase())?.id;
        if (genreId) {
            movieResults = movieResults.filter(movie => movie.genre_ids.includes(genreId));
        }
    }

    return movieResults;
}

// Display the results
function displayResults(movies) {
    const results = document.getElementById('results');
    results.innerHTML = '';

    if (movies.length === 0) {
        results.innerHTML = '<p>No results found.</p>';
        results.style.display = 'none';
        return;
    }

    // Display movies
    movies.forEach(movie => {
        const movieDiv = document.createElement('div');
        movieDiv.className = 'indivMovie';

        const movieTitle = document.createElement('h2');
        movieTitle.textContent = movie.title;

        const moviePoster = document.createElement('img');
        moviePoster.className = 'moviePoster';
        moviePoster.src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';

        const movieDescription = document.createElement('p');
        movieDescription.className = 'movie-description';
        movieDescription.textContent = movie.overview;

        const showMore = document.createElement('span');
        showMore.className = 'show-more';
        showMore.textContent = 'Show more';
        showMore.addEventListener('click', () => {
            movieDescription.classList.toggle('expanded');
            showMore.textContent = movieDescription.classList.contains('expanded') ? 'Show less' : 'Show more';
        });

        movieDiv.appendChild(movieTitle);
        movieDiv.appendChild(moviePoster);
        movieDiv.appendChild(movieDescription);
        movieDiv.appendChild(showMore);

        results.appendChild(movieDiv);
    });

    results.style.display = 'grid';
}