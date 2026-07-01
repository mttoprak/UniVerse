import { Scale, Code2, ShieldAlert, AlertTriangle, FileX, Gavel, ShieldCheck } from 'lucide-react';

type Paragraph = { heading?: string; text: string; isCritical?: boolean };

const sections: {
    number: string;
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    paragraphs: Paragraph[];
}[] = [
    {
        number: "1",
        title: "Lisansın Verilmesi ve Kapsamı",
        icon: <Scale size={15} className="text-fuchsia-400" />,
        paragraphs: [
            {
                heading: "Sınırlı Lisans",
                text: "Geliştirici, Kullanıcı'ya; Yazılımı yalnızca kişisel, ticari olmayan (ilan verme, başvuruda bulunma, mesajlaşma ve koleksiyon oluşturma amaçlı) amaçlarla kullanması için devredilemez, münhasır olmayan, geri alınabilir ve sınırlı bir kullanım lisansı vermektedir.",
            },
            {
                heading: "Mülkiyet Hakkı",
                text: "Bu Sözleşme Yazılım'ın veya kaynak kodlarının satışı anlamına gelmez. Yazılım'ın tüm mülkiyet, telif, patent ve diğer fikri mülkiyet hakları saklıdır ve tamamen geliştirici ekibine aittir.",
            },
        ],
    },
    {
        number: "2",
        title: "Kullanım Kısıtlamaları ve Yasaklar",
        icon: <Code2 size={15} className="text-rose-400" />,
        paragraphs: [
            {
                heading: "Tersine Mühendislik ve Kopyalama",
                text: "Yazılımın kaynak kodlarını (Next.js frontend, Node.js/Express backend yapıları dahil) kopyalamak, tersine mühendislik (reverse engineering) yapmak, kaynak koda dönüştürmek (decompile) veya kaynak kodları üzerinde değişiklik yaparak alternatif bir platform türetmek kesinlikle yasaktır.",
                isCritical: true,
            },
            {
                heading: "Veri Madenciliği (Scraping)",
                text: "Platformda yer alan kullanıcı verilerini, ilanları, .edu doğrulamalı öğrenci listelerini veya telefon numaralarını botlar, web örümcekleri (crawlers) veya otomatik scriptler vasıtasıyla toplamak, çekmek ve harici veritabanlarında saklamak yasaktır.",
                isCritical: true,
            },
            {
                heading: "Hizmetin Kötüye Kullanımı",
                text: "API endpoint'lerine DDoS, brute-force veya botlar aracılığıyla spam istekler göndererek sistemi manipüle etmek veya sunucuyu yavaşlatmaya çalışmak yasal işlem sebebidir.",
                isCritical: true,
            },
        ],
    },
    {
        number: "3",
        title: "Kullanıcı İçerikleri ve Fikri Mülkiyet",
        icon: <ShieldAlert size={15} className="text-cyan-400" />,
        paragraphs: [
            {
                heading: "İçerik Lisansı",
                text: "Kullanıcı, Platform üzerinde yayınladığı ilan metinleri, fotoğrafları (Cloudinary üzerinde saklanan görseller dahil) ve yorumlar üzerinde mülkiyet haklarını korur. Ancak Kullanıcı, bu içeriklerin Platform üzerinde sergilenmesi, listelenmesi ve sistemin işleyişi amacıyla kullanılabilmesi için Platforma dünya çapında, telifsiz ve kalıcı bir yayınlama lisansı vermiş sayılır.",
            },
            {
                heading: "Loglama ve Yedekleme",
                text: "Sistem güvenliği, aktivite logları (ActivityLog) ve veritabanı yedekleme protokolleri kapsamında, kullanıcının yaptığı işlemler ve yüklediği veriler yasal mevzuat sınırları dahilinde güvenli sunucularda saklanır.",
            },
        ],
    },
    {
        number: "4",
        title: "Garanti Verilmemesi ve Sorumluluğun Sınırlandırılması",
        icon: <AlertTriangle size={15} className="text-amber-400" />,
        paragraphs: [
            {
                heading: '"Olduğu Gibi" (As-Is) Kullanım',
                text: "Yazılım, Kullanıcı'ya \"olduğu gibi\" ve \"mevcut haliyle\" sunulmaktadır. Geliştirici; Yazılımın kesintisiz çalışacağını, tamamen hatasız olacağını veya belirli bir amaca (örneğin kesin iş/burs bulma veya kesin satış yapma) hizmet edeceğini garanti etmez.",
            },
            {
                heading: "Zarar Sorumluluğu",
                text: "Platform veya Platformda yer alan harici yönlendirme linkleri (application_url) nedeniyle Kullanıcı'nın cihazlarında meydana gelebilecek veri kayıplarından, yazılımsal/donanımsal çökmelerden veya kullanıcılar arası (Sivil/Öğrenci) etkileşimlerden doğabilecek hiçbir doğrudan veya dolaylı maddi/manevi zarardan Platform geliştiricileri sorumlu tutulamaz.",
                isCritical: true,
            },
        ],
    },
    {
        number: "5",
        title: "Lisansın Feshi ve Hesap Askıya Alma",
        icon: <FileX size={15} className="text-rose-400" />,
        paragraphs: [
            {
                heading: "İhlal Durumunda Fesih",
                text: "Kullanıcı'nın bu Sözleşme'deki kısıtlamalardan herhangi birini (kod kopyalama, veri madenciliği, sahte .edu maili beyanı vb.) ihlal etmesi durumunda, işbu lisans ve Kullanıcı'nın Platforma erişim hakkı hiçbir ihbara gerek kalmaksızın otomatik olarak feshedilir.",
            },
            {
                heading: "Verilerin Silinmesi/Saklanması",
                text: "Lisansın feshi durumunda Kullanıcı'nın aktif ilanları sistemden kaldırılır; ancak sistem bütünlüğü ve yasal log gereksinimleri (soft delete mekanizması) uyarınca geçmiş veritabanı kayıtları saklanmaya devam edebilir.",
            },
        ],
    },
    {
        number: "6",
        title: "Bölünebilirlik ve Yetkili Mahkeme",
        icon: <Gavel size={15} className="text-fuchsia-400" />,
        paragraphs: [
            {
                heading: "Bölünebilirlik",
                text: "Bu Sözleşme'nin herhangi bir maddesinin yasal olarak geçersiz veya uygulanamaz sayılması durumunda, söz konusu madde Sözleşme'den çıkarılmış kabul edilir ve Sözleşme'nin geri kalan maddeleri tam olarak yürürlükte kalmaya devam eder.",
            },
            {
                heading: "Yetkili Mahkeme",
                text: "Bu Sözleşme'den doğabilecek her türlü uyuşmazlığın çözümünde Türkiye Cumhuriyeti Kanunları geçerlidir ve İzmir Mahkemeleri ile İcra Daireleri yetkilidir.",
            },
        ],
    },
];

export default function EulaPage() {
    return (
        <>
            <div
                className="fixed inset-0 w-full h-full -z-50 pointer-events-none"
                style={{
                    backgroundColor: '#050505',
                    backgroundImage: `
                        radial-gradient(ellipse at 75% 20%, rgba(192, 38, 211, 0.07) 0%, transparent 50%),
                        radial-gradient(ellipse at 25% 80%, rgba(124, 58, 237, 0.06) 0%, transparent 50%),
                        linear-gradient(to bottom, #050505, #0B0B10)
                    `,
                }}
            />

            <div className="flex flex-col items-center w-full min-h-screen pb-24">
                <div className="w-full max-w-3xl mx-auto pt-28 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Header */}
                    <div className="mb-12">
                        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-xs font-black uppercase tracking-widest mb-6">
                            <ShieldCheck size={13} />
                            <span>Yasal Belgeler</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white leading-tight mb-4">
                            Son Kullanıcı{' '}
                            <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-purple-500 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(192,38,211,0.5)]">
                                Lisans Sözleşmesi
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500">
                            Son güncelleme:{' '}
                            <span className="text-gray-400 font-medium">09 Haziran 2026</span>
                            <span className="ml-3 text-gray-600">·</span>
                            <span className="ml-3 text-gray-500">EULA</span>
                        </p>
                    </div>

                    {/* Intro card */}
                    <div className="mb-14 bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="mt-0.5 shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                                <Scale size={16} className="text-fuchsia-400" />
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                İşbu Son Kullanıcı Lisans Sözleşmesi ("Sözleşme"), Platform yazılımının, kaynak kodlarının,
                                arayüz tasarımlarının, veritabanı yapısının ve sunulan dijital hizmetlerin (hepsi birlikte{' '}
                                <span className="text-white font-semibold">"Yazılım"</span> veya{' '}
                                <span className="text-white font-semibold">"Platform"</span> olarak anılacaktır) telif
                                sahibi/geliştiricileri ile Platformu kullanan son kullanıcı arasında akdedilmiş yasal bir
                                sözleşmedir. Platforma kayıt olunması veya hizmetlerden yararlanılması, bu Sözleşme'nin tüm
                                şartlarının eksiksiz olarak{' '}
                                <span className="text-white font-semibold">kabul edildiği</span> anlamına gelir.
                            </p>
                        </div>
                    </div>

                    {/* Sections */}
                    <div className="flex flex-col gap-6">
                        {sections.map((section) => (
                            <div
                                key={section.number}
                                className="group bg-black/40 backdrop-blur-xl border border-white/5 hover:border-fuchsia-500/20 rounded-3xl overflow-hidden transition-all duration-500"
                            >
                                {/* Section header */}
                                <div className="flex items-center gap-4 px-6 pt-6 pb-5 border-b border-white/5">
                                    <span className="font-mono text-xs font-black text-fuchsia-500 bg-fuchsia-500/10 border border-fuchsia-500/20 px-2.5 py-1 rounded-lg tracking-widest">
                                        {section.number.padStart(2, '0')}
                                    </span>
                                    <div className="flex items-center gap-2.5">
                                        <span className="shrink-0">{section.icon}</span>
                                        <div>
                                            <h2 className="text-base font-black text-white leading-snug">
                                                {section.title}
                                            </h2>
                                            {section.subtitle && (
                                                <p className="text-xs text-gray-500 mt-0.5">{section.subtitle}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-5 space-y-3">
                                    {section.paragraphs.map((para, i) =>
                                        para.isCritical ? (
                                            <div
                                                key={i}
                                                className="relative bg-rose-500/5 border border-rose-500/30 rounded-2xl p-5 overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-[50px]" />
                                                <div className="flex items-center gap-2 mb-3 relative z-10">
                                                    <AlertTriangle size={13} className="text-rose-400" />
                                                    <span className="text-xs font-black text-rose-400 uppercase tracking-widest">
                                                        Yasak / Kritik
                                                    </span>
                                                </div>
                                                {para.heading && (
                                                    <p className="text-xs font-bold text-rose-300/80 mb-1.5 relative z-10">
                                                        {para.heading}
                                                    </p>
                                                )}
                                                <p className="text-sm text-rose-100/60 leading-relaxed relative z-10">
                                                    {para.text}
                                                </p>
                                            </div>
                                        ) : (
                                            <div
                                                key={i}
                                                className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4"
                                            >
                                                {para.heading && (
                                                    <p className="text-xs font-black text-gray-300 uppercase tracking-wide mb-2">
                                                        {para.heading}
                                                    </p>
                                                )}
                                                <p className="text-sm text-gray-400 leading-relaxed">{para.text}</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <p className="mt-10 text-xs text-gray-600 text-center leading-relaxed">
                        İşbu EULA sözleşmesi, Platformu kullanmaya başladığınız veya hesap oluşturduğunuz andan itibaren yasal olarak bağlayıcı şekilde yürürlüğe girer.
                    </p>
                </div>
            </div>
        </>
    );
}