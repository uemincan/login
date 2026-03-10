const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON formatındaki istek gövdelerini (req.body) ayrıştırmak için
app.use(express.json());

// Frontend farklı bir portta (ya da domain'de) çalışırsa diye CORS (Cross-Origin Resource Sharing) izinleri
app.use(cors());

// Statik HTML (Frontend) dosyamızı sunmak için "public" klasörünü kullanıyoruz
app.use(express.static(path.join(__dirname, 'public')));

// Login endpoint'i (Frontend'den POST isteği buraya gelecek)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    // 1. Kullanıcı adı ve şifre boşsa hata dön
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir.' });
    }

    let browser;
    try {
        // 2. Puppeteer ile arka planda gizli (headless) bir tarayıcı başlatıyoruz
        browser = await puppeteer.launch({
            headless: 'new', // Using the new headless mode
            // Render üzerindeki path (eğer Puppeteer kendi indiremezse diye)
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Docker/Render ortamlarında bellek limitleri için önemli
                '--single-process' // Çoğu cloud provider (özellikle ücretsiz planlarda) çok işlemde çöktüğü için
            ]
        });
        const page = await browser.newPage();

        // 3. Hedef sitenin giriş sayfasına gidin (cats.iku.edu.tr login sayfası)
        // Not: Direkt portal adresine gitmek yerine formu içeren kesin giriş sayfasına gitmek daha sağlıklıdır
        await page.goto('https://cats.iku.edu.tr/portal/login', { waitUntil: 'networkidle2' });

        // 4. Kullanıcı adı ve şifre inputlarını bul ve doldur
        // ÖNEMLİ: '#eid' ve '#pw' seçicileri (selectors) sitenin kaynak kodlarındaki input'ların id'leridir.
        // Eğer hedef site bu id'leri değiştirirse, bu kısımların da güncellenmesi gerekir.
        await page.type('#eid', username);
        await page.type('#pw', password);

        // 5. Giriş butonuna tıkla ve sunucunun yanıt vermesini (navigasyon) bekle
        // ÖNEMLİ: '#submit' butonun id'sidir, siteye göre değişiklik gösterebilir.
        await Promise.all([
            page.click('#submit'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(e => console.log('Yönlendirme beklenirken hata veya süre aşımı'))
        ]);

        // 6. Başarılı giriş kontrolü
        // Yöntem A: URL'nin değişip değişmediğini kontrol etme
        const currentUrl = page.url();

        // Yöntem B: Cookies (Çerezleri) kontrol etme
        const cookies = await page.cookies();

        // cats.iku.edu.tr sitesi muhtemelen JSESSIONID isminde bir oturum çerezi bırakır (Sitenin altyapısına göre değişebilir).
        // Başarılı giriş kriterimizi: "URL artık 'login' içermiyor VEYA geçerli yetkilendirme çerezine (JSESSIONID) sahip" olarak varsayalım.
        const hasSessionCookie = cookies.some(cookie => cookie.name.includes('JSESSIONID') || cookie.name.includes('SAKAI'));
        const isNotOnLoginPage = !currentUrl.includes('login') && !currentUrl.includes('error');

        // Giriş yapılıp yapılmadığına karar verelim
        const isLoggedIn = isNotOnLoginPage && hasSessionCookie;

        if (isLoggedIn) {
            // Başarılı girişten sonra ekrandaki İsim Soyisim bilgisini çekmeye çalışalım
            // Sakai sistemlerinde genelde profil ismi ".Mrphs-userNav__submenuitem--fullname" veya "#loginLinks a span" gibi yerlerde bulunur.
            let fullName = username; // Bulamazsak varsayılan olarak numarayı gönderelim

            try {
                // Sayfanın tamamen yüklenmesi için kısa bir süre tanıyalım
                await page.waitForSelector('.Mrphs-userNav__submenuitem--fullname', { timeout: 3000 });
                fullName = await page.$eval('.Mrphs-userNav__submenuitem--fullname', el => el.textContent.trim());
            } catch (e) {
                console.log('İsim soyisim elementi bulunamadı, öğrenci numarası kullanılacak.');
            }

            // Eğer giriş başarılıysa (Çerezler oluştuysa ve sayfaya girildiyse)
            res.json({ success: true, message: 'Sisteme giriş sağlandı', username: fullName });
        } else {
            // Hatalı bilgiler, eksik çerez vs.
            res.json({ success: false, message: 'Giriş sağlanmadı (Kullanıcı adı veya şifre hatalı)' });
        }

    } catch (error) {
        console.error('Puppeteer İşlem Hatası:', error);
        res.status(500).json({ success: false, message: 'Arka planda doğrulama yapılırken bir hata oluştu.' });
    } finally {
        if (browser) {
            // 7. Tarayıcıyı muhakkak kapat. Aksi takdirde belleği doldurur (Memory Leak)
            await browser.close();
        }
    }
});

// Sunucuyu başlat ve dinlemeye al
app.listen(PORT, () => {
    console.log(`Sunucu aktif: http://localhost:${PORT}`);
    console.log(`Ön yüzü görüntülemek için tarayıcınızdan yukarıdaki adrese gidin.`);
});
