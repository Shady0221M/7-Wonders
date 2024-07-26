import React from "react";
function Card(props) {
  return (
    <div className="card">
      <img className="avatar" src={props.image} alt="image_song" />
      <h2>{props.name}</h2>
      <h4>{props.artist_name}</h4>
      <h4>{props.album_name}</h4>
    </div>
  );
}

export default Card;