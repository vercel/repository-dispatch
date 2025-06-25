'use client';

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-8xl font-bold mb-4 bg-gradient-to-r from-gray-900 via-white to-gray-900 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
        Hello
      </h1>
      <p className="text-2xl text-gray-600">Smoke Test Example</p>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
