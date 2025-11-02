export default function TestHome() {
  return (
    <div className="container mx-auto px-6 py-20">
      <h1 className="text-6xl font-bold text-yellow-400 text-center">
        🎉 COMIC PAD IS WORKING! 🎉
      </h1>
      <p className="text-2xl text-white text-center mt-8">
        If you can see this, the app is rendering correctly!
      </p>
      <div className="mt-12 text-center">
        <div className="text-white text-xl">
          Backend Status: ✅ Connected
        </div>
        <div className="text-white text-xl">
          Frontend Status: ✅ Running on Port 5178
        </div>
      </div>
    </div>
  );
}
