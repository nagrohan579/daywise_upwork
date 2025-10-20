import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer>
      <p>© 2025 Daywise</p>
      <ul>
        <li>
          <Link to={"/privacy-policy"}>Privacy</Link>
        </li>
        <li>
          <Link to={"/terms"}>Terms</Link>
        </li>
      </ul>
    </footer>
  );
};

export default Footer;
