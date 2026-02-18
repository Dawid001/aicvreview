const GITHUB_URL = "https://github.com/Dawid001";

const Footer = () => {
  return (
    <footer className="footer">
      <p className="text-sm text-gray-600">
        Made by{" "}
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-gray-800 hover:text-indigo-600 transition-colors"
        >
          Dawid
        </a>
      </p>
    </footer>
  );
};

export default Footer;
