# UniVerse

**Kampüs İçi İhtiyaç ve Hizmet Paylaşımı İçin Bütünleşik Web Ekosistemi**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-Styling-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

---

## Proje Hakkında

**UniVerse**, üniversite öğrencilerinin kampüs içi barınma, ulaşım, ders materyali paylaşımı, ikinci el eşya alım-satımı ve acil ihtiyaçlarını anonimlikten uzak, güvenli bir ortamda çözmelerini sağlayan kapalı devre bir kampüs ekosistemidir.

Geleneksel ilan platformlarının aksine UniVerse, yalnızca doğrulanmış öğrencilere özeldir ve kampüs dinamiklerine uygun **"aksiyon odaklı"** bir P2P (Peer-to-Peer) dayanışma ağı sunar. Modern, kullanıcı arayüzü ile yüksek performanslı bir kullanıcı deneyimi vaat eder.

## Temel Özellikler ve Modüller

* **.edu.tr Doğrulaması:** Sadece üniversite tarafından tahsis edilmiş e-posta ile doğrulanmış hesapların işlem yapabildiği kapalı ve güvenli ağ. Öğrenci olmayan kullanıcılar da kayıt olabilir ancak kısıtlı erişimi olur.
*  **Dinamik Kategori Yönetimi:** İkinci El, İş/Staj, Burs, Özel Ders, Yol Arkadaşı, Ev/Oda Arkadaşı ve Not olmak üzere her ana kategoriye özel detaylı veri giriş formları sağlayan İlan Oluşturma Sihirbazı.
*  **Acil Durum Panosu (Flash-Listings):** Kampüs içi acil kan, kayıp eşya veya anlık ihtiyaçlar için süreli ve standart akıştan bağımsız özel ilan sistemi.
*  **Gelişmiş Filtreleme:** Debounce algoritmalarıyla optimize edilmiş, sunucuyu yormayan asenkron arama, fiyat ve kategori filtrelemesi.
*  **Güvenli Kimlik Doğrulama:** Şifre sıfırlama, e-posta onaylama ve oturum yönetimi için JWT (JSON Web Token) ve bcrypt altyapısı.

## Teknoloji Yığını ve Mimari

Sistem, baştan uca modern ve ölçeklenebilir MERN (MongoDB, Express.js, React/Next.js, Node.js) yığını üzerine inşa edilmiştir.

### Frontend Mimari
* **Framework:** Next.js (App Router)
* **Arayüz Tasarımı:** Tailwind CSS ile "Glassmorphism" ve siberpunk temalı modern UI.
* **Durum Yönetimi & API Entegrasyonu:** React Hooks (`useState`, `useEffect`) ile asenkron veri yönetimi ve Optimistic UI güncellemeleri.

### Backend ve Veritabanı Mimarisi
* **RESTful API:** Node.js ve Express.js üzerinde modüler rotalama mimarisi.
* **NoSQL Veritabanı:** MongoDB ve Mongoose ORM.
* **Mongoose Discriminator Pattern:** İlişkisel veritabanlarının hantal "JOIN" işlemlerinden kaçınmak için tüm ilan tiplerini ortak bir şemadan kalıtım yoluyla (`Listing` -> `Roommate`, `Carpooling` vb.) türeten, tek koleksiyon üzerinden yüksek performanslı indeksleme sağlayan esnek veri modeli.
* **Veri Validasyonu:** İstemciden gelen tüm verilerin `Zod` şemaları ile katı tiplendirme ve güvenlik kontrolünden geçirilmesi.
* **Medya Yönetimi:** `Multer` ve `Cloudinary` entegrasyonu ile bulut tabanlı, optimize edilmiş görsel depolama.

## Geliştirici Ekip

Bu proje; Ege Üniversitesi, Ön-Yüz Yazılım Geliştirme bölümü bitirme projesi kapsamında geliştirilmiştir.

* **Ahmet Emin GENÇ** - *Frontend Developer & UI/UX Designer*
* **Mehmet TOPRAK** - *Backend Developer & System Architect*
* **İsmail GÜLTEKİN** - *Security & Documentation Lead*
