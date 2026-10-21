function Logo({ className = 'logo' }) {
  return (
    <img
      src={`${process.env.PUBLIC_URL}/images/logo.png`}
      alt="Laundry"
      className={className}
    />
  );
}

export default Logo;
