import React from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import image from "../../../public/doubt.png";
const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="home">
      <div className="card">
        <h1>Welcome Users</h1>
        <p>Click on the button to navigate to dashboard</p>
        <button onClick={() => navigate("/dashboard")}>Go to dashboard</button>
      </div>
      <br />
      <img src={image} alt="" style={{ width: "150px", height: "auto" , marginBottom: "20px" }} />
    </div>
  );
};

export default Home;
