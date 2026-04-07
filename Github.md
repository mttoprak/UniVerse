# GITHUB COLLABORATION REHBERİ
ALTIN KURAL: Asla main branch'ına doğrudan push yapmayın. Her zaman yeni bir branch oluşturun ve değişikliklerinizi o branch'e push edin. Daha sonra, pull request (PR) oluşturarak değişikliklerinizi main branch'ına merge edin.

1 - Her kod yazmaya başlayacağınız zaman yerel projeyi güncellemeniz gerekmektedir. Bunun için terminalde aşağıdaki komutu kullanabilirsiniz:

```
git checkout main
git pull origin main
```

2 - Her özellik için yeni bir branch oluşturun. Branch adını, üzerinde çalıştığınız özelliği tanımlayacak şekilde seçin. Örneğin, "feature/login-page" gibi:

```
git checkout -b feature/login-page
```

3 - Kodu yazdıktan sonra kaydetmek için:

```
git add.
git commit -m "Login sayfası eklendi"
``` 

4 - Github'a göndermek için:

```
git push origin feature/login-page
```

5 - Github üzerinde, yeni oluşturduğunuz branch'i seçin ve "Compare & pull request" butonuna tıklayın. Değişikliklerinizi gözden geçirin ve ardından "Create pull request" butonuna tıklayarak PR oluşturun. Daha sonra, Ahmet PR'ı inceleyecek ve onayladıktan sonra main branch'ına merge edecektir. 

!!SAKIN SİZ MERGE ETMEYİN! PROJE PATLAMASIN!!

# TEMEL GITHUB KOMUTLARI
- `git checkout main`: main branch'ına geçiş yapar.
- `git pull origin main`: remote repository'den main branch'ını günceller.
- `git checkout -b feature/login-page`: yeni bir branch oluşturur ve o branch'e geçiş yapar.
- `git add .`: tüm değişiklikleri staging area'ya ekler. Lütfen . kullanmamaya çalışın, sadece değiştirdiğiniz dosyaları ekleyin. Örneğin, `git add src/components/LoginPage.js` gibi.
- `git commit -m "Commit mesajı"`: değişiklikleri commit eder. Commit mesajı, yaptığınız değişikliği açıklayan kısa ve öz bir mesaj olmalıdır. Github üzerinden gözükeceği için dikkatli seçin.
- `git push origin feature/login-page`: oluşturduğunuz branch'i remote repository'ye (Github'a) gönderir.

# YAPILMAMASI GEREKENLER
- Main branch'ına doğrudan push yapmak.
- Commit mesajlarını açıklayıcı olmayan şekilde yazmak. Örneğin, "değişiklikler yapıldı" gibi genel mesajlar yerine, "Login sayfası eklendi" gibi spesifik mesajlar yazmak daha iyidir.
- Değişikliklerinizi düzenli olarak commit etmek yerine, büyük değişiklikleri tek bir commit'e eklemek. Bu, değişikliklerinizi takip etmeyi zorlaştırır ve hata ayıklamayı daha karmaşık hale getirir. Değişikliklerinizi mantıklı parçalara bölerek düzenli olarak commit yapmanız önerilir.
- Branch adlarını belirsiz veya genel tutmak. Branch adları, üzerinde çalıştığınız özelliği veya düzeltmeyi açıkça belirtmelidir. Örneğin, "feature/login-page" gibi spesifik branch adları kullanmak, projenin düzenli ve anlaşılır kalmasına yardımcı olur.
- PR'ları manuel olarak merge etmeyin. PR'lar, Ahmet tarafından incelenip onaylandıktan sonra merge edilmelidir. Bu, kod kalitesini ve projenin bütünlüğünü korumaya yardımcı olur.
- git force push kullanmak. Bu komut, remote repository'deki değişiklikleri zorla geçersiz kılar ve diğer ekip üyelerinin çalışmalarını etkileyebilir. Force push yapmaktan kaçının ve gerektiğinde ekip üyeleriyle iletişim kurarak uygun bir çözüm bulun.



