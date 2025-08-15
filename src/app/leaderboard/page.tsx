
async function getTopBettors() {
    try {
        // Replace with your actual API URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (process.env.NODE_ENV === 'development' 
                        ? 'http://localhost:3000' 
                        : ''); //TODO add url

        const res = await fetch(`${baseUrl}/api/topBettors`, {
            // next: { revalidate: 60 },
            cache: 'no-store',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })
        
        if (!res.ok) {
            throw new Error('Failed to fetch bettors');
        }
        
        const topBettors = await res.json();
        console.log("TopBettors: ",topBettors)
        return topBettors;
    } catch (error) {
        console.error('Error fetching bettors:', error);
        return [];
    }
}

export default async function Leaderboard() {
    const allBettors:Bettor[] = await getTopBettors();
    
    const topBettors = allBettors.slice(0, 3);
    const otherBettors = allBettors.slice(3);

    return (
        <div className="w-full overflow-y-scroll no-scrollbar">
            <div className="min-h-screen w-full bg-black text-white p-6 mx-auto items-center">
                <h1 className="text-xl sm:text-2xl md:text-3xl mb-6 font-extrabold tracking-tight text-white transition-all duration-300">
                    Top Bettors
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {topBettors.map((bettor) => (
                    <BettorCard key={bettor.rank} {...bettor} />
                    ))}
                </div>
                <BettorsTable bettors={otherBettors} />
            </div>
        </div>
    );
}