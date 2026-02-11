// Replace 'YOUR_API_KEY' below with your API key retrieved from https://www.themoviedb.org
var myAPI = 'f29ab3f35cb7c95600c11df45583e6b9'; // global string to be consistent with future usages elsewhere

$(function () {
  $('#movie_list').css('display', 'none');

  $('#autoComplete').blur(function () {
    $('#movie_list').css('display', 'none');
  });

  // Button will be disabled until we type something inside the input field
  const source = document.getElementById('autoComplete');

  const inputHandler = function (e) {
    $('#movie_list').css('display', 'block');

    if (e.target.value == "") {
      $('.movie-button').attr('disabled', true);
    } else {
      $('.movie-button').attr('disabled', false);
    }
  };

  source.addEventListener('input', inputHandler);

  $('.fa-arrow-up').click(function () {
    $('html, body').animate({ scrollTop: 0 }, 'slow');
  });

  $('.app-title').click(function () {
    window.location.href = '/';
  });

  $('.movie-button').on('click', function () {
    var my_api_key = myAPI;
    var title = $('.movie').val();

    $('#movie_list').css('display', 'none');

    if (title == "") {
      $('.results').css('display', 'none');
      $('.fail').css('display', 'block');
    }

    if (($('.fail').text() && ($('.footer').css('position') == 'absolute'))) {
      $('.footer').css('position', 'fixed');
    } else {
      load_details(my_api_key, title, true);
    }
  });
});

// will be invoked when clicking on the recommended movie cards
function recommendcard(id) {
  $("#loader").fadeIn();
  var my_api_key = myAPI;
  load_details(my_api_key, id, false);
}

// get the details of the movie from the API (based on the name of the movie)
function load_details(my_api_key, search, isQuerySearch) {
  let url;

  if (isQuerySearch) {
    url = '/api/tmdb/search?q=' + encodeURIComponent(search);
  } else {
    url = 'https://api.themoviedb.org/3/movie/' + search + '?api_key=' + my_api_key;
  }

  console.log("Calling TMDB:", url);

  $.ajax({
    type: 'GET',
    url: url,
    success: function (movie) {
      console.log("TMDB response:", movie);

      if (!isQuerySearch) {
        get_movie_details(movie.id, my_api_key, movie.title, movie.original_title);
      } 
      else if (!movie.results || movie.results.length < 1) {
        $('.fail').show();
        $('.results').hide();
      } 
      else {
        const first = movie.results[0];
        get_movie_details(first.id, my_api_key, first.title, first.original_title);
      }
    },
    error: function (xhr, status, err) {
      console.error("TMDB Error:");
      console.error("Status:", status);
      console.error("Error:", err);
      console.error("Response:", xhr.responseText);
      alert("Network error contacting TMDB. Check console.");
    }
  });
}


// get all the details of the movie using the movie id.
function get_movie_details(movie_id, my_api_key, movie_title, movie_title_org) {
  console.log("Fetching movie details for ID:", movie_id);

  $.ajax({
    type: 'GET',
    url: 'https://api.themoviedb.org/3/movie/' + movie_id + '?api_key=' + my_api_key,
    success: function (movie_details) {
      console.log("Movie details fetched:", movie_details);

      // Fetch cast details
      $.ajax({
        type: 'GET',
        url: 'https://api.themoviedb.org/3/movie/' + movie_id + '/credits?api_key=' + my_api_key,
        success: function (credits) {
          console.log("Cast details fetched:", credits);

          show_details(movie_details, movie_title, my_api_key, movie_id, movie_title_org, credits);
        },
        error: function (err) {
          console.error("Error fetching credits:", err);
        }
      });
    },
    error: function (error) {
      console.error("Error fetching movie details:", error);
      $("#loader").delay(500).fadeOut();
    }
  });
}


// function show_details(movie_details, movie_title, my_api_key, movie_id, movie_title_org, credits) {

//   console.log("Movie:", movie_details);
//   console.log("Credits:", credits);

//   const topCast = credits.cast.slice(0, 10);

//   const cast_ids = topCast.map(c => c.id);
//   const cast_names = topCast.map(c => c.name);
//   const cast_chars = topCast.map(c => c.character);
//   const cast_profiles = topCast.map(c => 
//     c.profile_path 
//       ? 'https://image.tmdb.org/t/p/w500' + c.profile_path 
//       : '/static/default_profile.jpg'
//   );

// }


// passing all the details to python's flask for displaying and scraping the movie reviews using imdb id
function show_details(movie_details,movie_title,my_api_key,movie_id,movie_title_org){
  var imdb_id = movie_details.imdb_id;
  var poster;
  if(movie_details.poster_path){
    poster = 'https://image.tmdb.org/t/p/original'+movie_details.poster_path;
  }
  else {
    poster = 'static/default.jpg';
  }
  var overview = movie_details.overview;
  var genres = movie_details.genres;
  var rating = movie_details.vote_average;
  var vote_count = movie_details.vote_count;
  var release_date = movie_details.release_date;
  var runtime = parseInt(movie_details.runtime);
  var status = movie_details.status;
  var genre_list = []
  for (var genre in genres){
    genre_list.push(genres[genre].name);
  }
  var my_genre = genre_list.join(", ");
  if(runtime%60==0){
    runtime = Math.floor(runtime/60)+" hour(s)"
  }
  else {
    runtime = Math.floor(runtime/60)+" hour(s) "+(runtime%60)+" min(s)"
  }

  // calling `get_movie_cast` to get the top cast for the queried movie
  movie_cast = get_movie_cast(movie_id,my_api_key);
  
  // calling `get_individual_cast` to get the individual cast details
  ind_cast = get_individual_cast(movie_cast,my_api_key);

  // calling `get_recommendations` to get the recommended movies for the given movie id from the TMDB API
  recommendations = get_recommendations(movie_id, my_api_key);
  
  details = {
      'title':movie_title,
      'cast_ids':JSON.stringify(movie_cast.cast_ids),
      'cast_names':JSON.stringify(movie_cast.cast_names),
      'cast_chars':JSON.stringify(movie_cast.cast_chars),
      'cast_profiles':JSON.stringify(movie_cast.cast_profiles),
      'cast_bdays':JSON.stringify(ind_cast.cast_bdays),
      'cast_bios':JSON.stringify(ind_cast.cast_bios),
      'cast_places':JSON.stringify(ind_cast.cast_places),
      'imdb_id':imdb_id,
      'poster':poster,
      'genres':my_genre,
      'overview':overview,
      'rating':rating,
      'vote_count':vote_count.toLocaleString(),
      'rel_date':release_date,  
      'release_date':new Date(release_date).toDateString().split(' ').slice(1).join(' '),
      'runtime':runtime,
      'status':status,
      'rec_movies':JSON.stringify(recommendations.rec_movies),
      'rec_posters':JSON.stringify(recommendations.rec_posters),
      'rec_movies_org':JSON.stringify(recommendations.rec_movies_org),
      'rec_year':JSON.stringify(recommendations.rec_year),
      'rec_vote':JSON.stringify(recommendations.rec_vote),
      'rec_ids':JSON.stringify(recommendations.rec_ids)
  }

  $.ajax({
    type:'POST',
    data:details,
    url:"/recommend",
    dataType: 'html',
    complete: function(){
      $("#loader").delay(500).fadeOut();
    },
    success: function(response) {
      $('.results').html(response);
      $('#autoComplete').val('');
      $('.footer').css('position','absolute');
      if ($('.movie-content')) {
        $('.movie-content').after('<div class="gototop"><i title="Go to Top" class="fa fa-arrow-up"></i></div>');
      }
      $(window).scrollTop(0);
    }
  });
}

// getting the details of individual cast
function get_individual_cast(movie_cast,my_api_key) {
    cast_bdays = [];
    cast_bios = [];
    cast_places = [];
    for(var cast_id in movie_cast.cast_ids){
      $.ajax({
        type:'GET',
        url:'https://api.themoviedb.org/3/person/'+movie_cast.cast_ids[cast_id]+'?api_key='+my_api_key,
        async:false,
        success: function(cast_details){
        }
      });
    }
    return {cast_bdays:cast_bdays,cast_bios:cast_bios,cast_places:cast_places};
  }

// getting the details of the cast for the requested movie
function get_movie_cast(movie_id,my_api_key){
    cast_ids= [];
    cast_names = [];
    cast_chars = [];
    cast_profiles = [];
    top_10 = [0,1,2,3,4,5,6,7,8,9];
    $.ajax({
      type:'GET',
      url:"https://api.themoviedb.org/3/movie/"+movie_id+"/credits?api_key="+my_api_key,
      async:false,
      success: function(my_movie){
        if(my_movie.cast.length>0){
          if(my_movie.cast.length>=10){
            top_cast = [0,1,2,3,4,5,6,7,8,9];
          }
          else {
            top_cast = [0,1,2,3,4];
          }
          for(var my_cast in top_cast){
            cast_ids.push(my_movie.cast[my_cast].id)
            cast_names.push(my_movie.cast[my_cast].name);
            cast_chars.push(my_movie.cast[my_cast].character);
            if(my_movie.cast[my_cast].profile_path){
              cast_profiles.push("https://image.tmdb.org/t/p/original"+my_movie.cast[my_cast].profile_path);
            }
            else {
              cast_profiles.push("static/default.jpg");
            }
          }
        }
      },
      error: function(error){
        alert("Invalid Request! - "+error);
        $("#loader").delay(500).fadeOut();
      }
    });

    return {cast_ids:cast_ids,cast_names:cast_names,cast_chars:cast_chars,cast_profiles:cast_profiles};
  }

  // getting recommendations
  function get_recommendations(movie_id, my_api_key) {
    rec_movies = [];
    rec_posters = [];
    rec_movies_org = [];
    rec_year = [];
    rec_vote = [];
    rec_ids = [];
    
    $.ajax({
      type: 'GET',
      url: "https://api.themoviedb.org/3/movie/"+movie_id+"/recommendations?api_key="+my_api_key,
      async: false,
      success: function(recommend) {
        for(var recs in recommend.results) {
          rec_movies.push(recommend.results[recs].title);
          rec_movies_org.push(recommend.results[recs].original_title);
          rec_year.push(new Date(recommend.results[recs].release_date).getFullYear());
          rec_vote.push(recommend.results[recs].vote_average);
          rec_ids.push(recommend.results[recs].id)
          if(recommend.results[recs].poster_path){
            rec_posters.push("https://image.tmdb.org/t/p/original"+recommend.results[recs].poster_path);
          }
          else {
            rec_posters.push("static/default.jpg");
          }
        }
      },
      error: function(error) {
        alert("Invalid Request! - "+error);
        $("#loader").delay(500).fadeOut();
      }
    });
    return {rec_movies:rec_movies,rec_movies_org:rec_movies_org,rec_posters:rec_posters,rec_year:rec_year,rec_vote:rec_vote,rec_ids:rec_ids};
  }





