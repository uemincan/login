const express = require('express');
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

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir.' });
    }

    try {
        const loginUrl = 'https://cats.iku.edu.tr/portal/xlogin';
        const bodyParams = new URLSearchParams({
            eid: username,
            pw: password,
            submit: 'Giriş'
        });

        // Yönlendirmeleri (redirect) otomatik takip etmeyi kapatıyoruz (redirect: 'manual').
        // Böylece başarılı girişte dönen 302 yönlendirmesini beklemek ve ana sayfanın devasa HTML'ini
        // indirmek zorunda kalmıyoruz. Bu işlem süresini yarı yarıya kısaltacaktır.
        const fetchResponse = await fetch(loginUrl, {
            method: 'POST',
            body: bodyParams,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            redirect: 'manual'
        });

        // Cats sistemi başarılı girişte 302 yönlendirmesi (Redirect) yapar.
        // Hatalı girişte ise 200 OK ile tekrar login sayfasının HTML'ini döndürür.
        const isLoggedIn = fetchResponse.status === 302 || fetchResponse.status === 303;

        if (isLoggedIn) {
            // Yönlendirmeyi takip etmediğimiz için sayfa HTML'i elimizde değil, 
            // bu yüzden İsim Soyisim bilgisini siteden çekemiyoruz. Hız için username'i döndürüyoruz.
            res.json({ success: true, message: 'Sisteme giriş sağlandı', username: username });
        } else {
            res.json({ success: false, message: 'Giriş sağlanmadı (Kullanıcı adı veya şifre hatalı)' });
        }

    } catch (error) {
        console.error('Doğrulama Hatası:', error);
        res.status(500).json({ success: false, message: `Hata oluştu: ${error.message}` });
    }
});

// Sunucuyu başlat ve dinlemeye al
app.listen(PORT, () => {
    console.log(`Sunucu aktif: http://localhost:${PORT}`);
    console.log(`Ön yüzü görüntülemek için tarayıcınızdan yukarıdaki adrese gidin.`);
});
