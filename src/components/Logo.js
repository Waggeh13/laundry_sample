function Logo({ className = 'logo' }) {
  return (
    <img
      src={`${process.env.PUBLIC_URL}/images/logo.png`}
      alt="Kolendo Laundry Services"
      className={className}
    />
  );
}

export default Logo;
