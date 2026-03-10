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
        // Render gibi yavaş ortamlarda timeout süresini uzatıyoruz (60 saniye)
        await page.goto('https://cats.iku.edu.tr/portal/login', { waitUntil: 'networkidle2', timeout: 60000 });

        // 4. Kullanıcı adı ve şifre inputlarını bul ve doldur
        await page.waitForSelector('#eid', { timeout: 10000 });
        await page.type('#eid', username);
        await page.type('#pw', password);

        // 5. Giriş butonuna tıkla ve sunucunun yanıt vermesini (navigasyon) bekle
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log('Yönlendirme beklenirken hata veya süre aşımı')),
            page.click('#submit')
        ]);

        // 6. Başarılı giriş kontrolü
        const currentUrl = page.url();
        const cookies = await page.cookies();

        const hasSessionCookie = cookies.some(cookie => cookie.name.includes('JSESSIONID') || cookie.name.includes('SAKAI'));
        const isNotOnLoginPage = !currentUrl.includes('login') && !currentUrl.includes('error');
        const isLoggedIn = isNotOnLoginPage && hasSessionCookie;

        if (isLoggedIn) {
            let fullName = username;
            try {
                await page.waitForSelector('.Mrphs-userNav__submenuitem--fullname', { timeout: 5000 });
                fullName = await page.$eval('.Mrphs-userNav__submenuitem--fullname', el => el.textContent.trim());
            } catch (e) {
                console.log('İsim soyisim elementi bulunamadı.');
            }
            res.json({ success: true, message: 'Sisteme giriş sağlandı', username: fullName });
        } else {
            res.json({ success: false, message: 'Giriş sağlanmadı (Kullanıcı adı veya şifre hatalı)' });
        }

    } catch (error) {
        console.error('Puppeteer İşlem Hatası:', error);
        // Hatayı direkt frontend'e göndererek sorunun kaynağını Render'da bulalım
        res.status(500).json({ success: false, message: `Hata oluştu: ${error.message}` });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// Sunucuyu başlat ve dinlemeye al
app.listen(PORT, () => {
    console.log(`Sunucu aktif: http://localhost:${PORT}`);
    console.log(`Ön yüzü görüntülemek için tarayıcınızdan yukarıdaki adrese gidin.`);
});
