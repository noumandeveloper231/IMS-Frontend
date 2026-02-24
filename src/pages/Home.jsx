import React from "react";
import Sidebar from "../components/Layout/Sidebar";
import Navbar from "../components/Layout/Navbar";
import Dashboard from "./Dashboard";

const Home = () => {
  return (
    <>
      <div className="flex">
        <Sidebar />
        <div className="grow h-full lg:h-screen bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-white">
          <Navbar />
          <div>
            <Dashboard />
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
