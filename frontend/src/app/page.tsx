import Link from 'next/link';
import { Zap, Home as HomeIcon, BookOpen, Car, Search, MessageSquareCode } from 'lucide-react';

// ilan kategorileri mock data
const categories = [
    {
        icon: Zap,
        title: 'Acil İlanlar',
        desc: 'Süreli ihtiyaçlar',
        link: '/acil-ilanlar',
        glowColor: 'shadow-rose-500/30',
        borderColor: 'border-rose-500/40',
        iconColor: 'text-rose-500',
        bgColor: 'bg-rose-950/20'
    },
    {
        icon: HomeIcon,
        title: 'Ev/Oda Arkadaşı',
        desc: 'Akıllı eşleşme',
        link: '/ev-arkadasi',
        glowColor: 'shadow-cyan-500/20',
        borderColor: 'border-cyan-500/30',
        iconColor: 'text-cyan-400',
        bgColor: 'bg-black/20'
    },
    {
        icon: BookOpen,
        title: 'Eşya & Not',
        desc: 'İkinci el takası',
        link: '/esya-not',
        glowColor: 'shadow-violet-500/20',
        borderColor: 'border-violet-500/30',
        iconColor: 'text-violet-400',
        bgColor: 'bg-black/20'
    },
    {
        icon: Car,
        title: 'Ulaşım',
        desc: 'Ortak araç',
        link: '/ulasim',
        glowColor: 'shadow-emerald-500/20',
        borderColor: 'border-emerald-500/30',
        iconColor: 'text-emerald-400',
        bgColor: 'bg-black/20'
    },
];

// canlı akış mock data
const activityFeed = [
    { id: 1, char: 'Z', user: 'Zeynep Y.', action: 'acil şarj aleti arıyor', loc: 'Merkez Kütüphane', time: 'Şimdi' },
    { id: 2, char: 'B', user: 'Burak K.', action: '2 kişilik araç ilanı açtı', loc: 'Bornova Metro -> Kampüs', time: '2 dk önce' },
    { id: 3, char: 'E', user: 'Elif S.', action: 'yetenek takası arıyor', loc: '(Almanca) Online', time: '5 dk önce' },
];

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center space-y-16">

            {/* hero: başlık ve alt başlık */}
            <div className="text-center mt-12 space-y-4 max-w-2xl mx-auto">
                <h1 className="text-6xl font-black tracking-tight text-white leading-tight">
                    Kampüsün <span className="bg-gradient-to-r from-cyan-400 to-violet-500 text-transparent bg-clip-text">Ekosistemi</span>
                </h1>
                <p className="text-lg text-gray-500 font-medium leading-relaxed">
                    Eşya sat, ev arkadaşı bul veya yeteneklerini takas et. Sadece doğrulanmış üniversite öğrencileri için.
                </p>
            </div>

            {/* (GÜNCELLENECEK) search bar */}
            <div className="w-full max-w-xl p-1 bg-black/50 border border-white/5 rounded-full shadow-[0_0_25px_rgba(100,100,200,0.15)] focus-within:border-cyan-500/30 focus-within:shadow-[0_0_25px_rgba(34,211,238,0.2)] transition-all">
                <div className="flex items-center px-6 py-2">
                    <Search size={20} className="text-gray-600 mr-4" />
                    <input
                        type="text"
                        placeholder="Q Laboratuvar önlüğü, kampüse araç, ders notu..."
                        className="flex-grow bg-transparent border-none focus:ring-0 text-gray-300 placeholder:text-gray-700 font-medium"
                    />
                    <button className="px-6 py-3 rounded-full bg-violet-600 text-white font-bold text-sm hover:bg-violet-500 transition-all shadow-[0_0_10px_#7c3aed]">
                        Bul
                    </button>
                </div>
            </div>

            {/* ilan kategori kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                {categories.map((cat, index) => (
                    <Link
                        key={index}
                        href={cat.link}
                        className={`flex items-center p-6 space-x-6 ${cat.bgColor} border ${cat.borderColor} rounded-3xl hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ${cat.glowColor}`}
                    >
                        <div className={`p-4 rounded-full bg-black/40 ${cat.iconColor} shadow-inner`}>
                            <cat.icon size={28} className="drop-shadow-lg" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-extrabold text-gray-100 tracking-tight">{cat.title}</span>
                            <span className="text-sm font-medium text-gray-600">{cat.desc}</span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* canlı akış */}
            <div className="w-full max-w-3xl bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-[0_0_30px_rgba(100,100,200,0.1)]">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                    <div className="flex items-center space-x-3 text-cyan-400">
                        <MessageSquareCode size={22} />
                        <h2 className="text-2xl font-black text-gray-100 tracking-tighter">Kampüsün Nabzı</h2>
                    </div>
                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-950/30 text-emerald-400 text-xs font-bold border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Canlı Akış</span>
                    </div>
                </div>

                {/* Akış Listesi */}
                <div className="space-y-6">
                    {activityFeed.map((item, index) => (
                        <div key={item.id} className={`flex items-center justify-between py-4 ${index !== activityFeed.length - 1 ? 'border-b border-white/5' : ''}`}>
                            <div className="flex items-center space-x-5 flex-grow">
                                {/* avatar ikon */}
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-800 border border-white/5 shadow-inner">
                                    <span className="text-lg font-black text-cyan-400">{item.char}</span>
                                </div>
                                {/* detaylar */}
                                <div className="flex flex-col">
                                    <p className="text-gray-300 font-medium">
                                        <span className="font-extrabold text-white">{item.user}</span> {item.action} <span className="text-cyan-400 font-bold">{item.loc}</span>
                                    </p>
                                </div>
                            </div>
                            {/* süre */}
                            <div className="flex-shrink-0 ml-6">
                                <span className={`text-sm font-bold ${item.time === 'Şimdi' ? 'text-emerald-400' : 'text-gray-600'}`}>{item.time}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}