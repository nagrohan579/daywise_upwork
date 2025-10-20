import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header>
      <div className="containerr">
        <div className="left">
          <Link to={"/"}>
            <img src="/assets/images/logo.svg" alt="logo" />
          </Link>
        </div>
        <div className="right">
          <button className="btn-login">
            <Link to={"/login"}> Log in</Link>
          </button>
          <button className="btn-signup">
            {" "}
            <Link to={"/signup"}>Sign up </Link>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
