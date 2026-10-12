/* ==========================================================
   THIỆP CƯỚI ONLINE - SCRIPT.JS
   Lưu RSVP + lời chúc vào Google Sheet qua Google Apps Script
   (cấu hình URL ở window.weddingData.apiUrl trong index.html)
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ---- DOM Elements ----
  const envelopeScreen = document.getElementById('envelope-screen');
  const openBtn = document.getElementById('open-btn');
  const mainContent = document.getElementById('main-content');
  const mainNav = document.getElementById('main-nav');
  const musicToggle = document.getElementById('music-toggle');
  const bgMusic = document.getElementById('bg-music');
  const petalsCanvas = document.getElementById('petals-canvas');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const rsvpForm = document.getElementById('rsvp-form');
  const toast = document.getElementById('toast');

  const wData = window.weddingData || {};

  // Trạng thái nhạc nền (khai báo sớm để các hàm bên dưới dùng được)
  let isMusicPlaying = false;

  // ============================================================
  // 0. GỌI GOOGLE APPS SCRIPT (Google Sheet)
  // ============================================================
  // Gửi dữ liệu: dùng Content-Type text/plain để trình duyệt KHÔNG gửi
  // preflight (Apps Script không xử lý được preflight).
  async function postToSheet(payload) {
    if (!wData.apiUrl) throw new Error('Chưa cấu hình apiUrl');
    const res = await fetch(wData.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Lỗi không xác định');
    return data;
  }

  // ============================================================
  // 1. MỞ THIỆP (Envelope Open Animation)
  // ============================================================
  openBtn.addEventListener('click', () => {
    // Phải gọi play() ngay trong thao tác của người dùng để mobile không chặn autoplay
    bgMusic.volume = 0.4;
    const earlyPlay = bgMusic.play();
    if (earlyPlay !== undefined) {
      earlyPlay.then(() => { isMusicPlaying = true; }).catch(() => { isMusicPlaying = false; });
    }

    const card = document.querySelector('.invitation-card');
    if (card) {
      card.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease';
      card.style.transform = 'translateY(-20px) scale(1.02)';
    }

    openBtn.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    openBtn.style.opacity = '0';
    openBtn.style.transform = 'scale(0.9)';
    openBtn.style.pointerEvents = 'none';

    setTimeout(() => {
      envelopeScreen.classList.add('fade-out');

      mainContent.classList.remove('hidden');
      mainContent.style.opacity = '0';
      mainContent.style.transition = 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)';

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mainContent.style.opacity = '1';
        });
      });

      setTimeout(() => mainNav.classList.add('visible'), 600);

      musicToggle.classList.remove('hidden');
      musicToggle.classList.toggle('paused', !isMusicPlaying);

      startPetals();
      petalsCanvas.classList.add('active');

      startFireworks();

      loadWishes();

      AOS.init({
        duration: 900,
        easing: 'ease-out-cubic',
        once: true,
        offset: 80,
      });

      // Bắt đầu tự cuộn sau khi thiệp hiện ra
      setTimeout(() => startAutoScroll(), 2000);
    }, 1000);
  });

  // ============================================================
  // 2. TỰ ĐỘNG CUỘN TRANG
  // ============================================================
  let autoScrollRAF = null;
  let autoScrollStopped = false;

  function startAutoScroll() {
    autoScrollStopped = false;

    // Dừng khi người dùng tự cuộn (chuột, chạm, bàn phím)
    function stopOnUserScroll() {
      autoScrollStopped = true;
      if (autoScrollRAF) {
        cancelAnimationFrame(autoScrollRAF);
        autoScrollRAF = null;
      }
      window.removeEventListener('wheel', stopOnUserScroll);
      window.removeEventListener('touchmove', stopOnUserScroll);
      window.removeEventListener('keydown', stopOnUserScroll);
    }

    window.addEventListener('wheel', stopOnUserScroll, { passive: true });
    window.addEventListener('touchmove', stopOnUserScroll, { passive: true });
    window.addEventListener('keydown', stopOnUserScroll);

    const totalHeight = document.body.scrollHeight - window.innerHeight;
    const pixelsPerSecond = 60; // tốc độ cuộn: 60px/giây (chậm, đều)
    const startTime = performance.now();
    const startY = window.scrollY;

    function step(now) {
      if (autoScrollStopped) return;
      const elapsed = (now - startTime) / 1000;
      const target = Math.min(startY + pixelsPerSecond * elapsed, totalHeight);
      window.scrollTo(0, target);
      if (target < totalHeight) {
        autoScrollRAF = requestAnimationFrame(step);
      }
    }

    autoScrollRAF = requestAnimationFrame(step);
  }

  // ============================================================
  // 3. NHẠC NỀN (Background Music)
  // ============================================================
  musicToggle.addEventListener('click', () => {
    if (isMusicPlaying) {
      bgMusic.pause();
      isMusicPlaying = false;
      musicToggle.classList.add('paused');
    } else {
      bgMusic.play().then(() => {
        isMusicPlaying = true;
        musicToggle.classList.remove('paused');
      }).catch(() => {});
    }
  });

  // ============================================================
  // 4. ĐỒNG HỒ ĐẾM NGƯỢC NGÀY CƯỚI
  // ============================================================
  const weddingDate = new Date(wData.weddingDate).getTime();

  function updateCountdown() {
    const diff = weddingDate - Date.now();

    if (isNaN(diff) || diff <= 0) {
      document.getElementById('cd-days').textContent = '🎉';
      document.getElementById('cd-hours').textContent = '--';
      document.getElementById('cd-minutes').textContent = '--';
      document.getElementById('cd-seconds').textContent = '--';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
    document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ============================================================
  // 5. GALLERY LIGHTBOX
  // ============================================================
  const galleryItems = document.querySelectorAll('.gallery-item');
  const galleryImages = Array.from(galleryItems).map(item => item.querySelector('img').src);
  let currentImageIndex = 0;

  galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      currentImageIndex = index;
      openLightbox(galleryImages[index]);
    });
  });

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    lightboxImg.src = galleryImages[currentImageIndex];
  }

  function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    lightboxImg.src = galleryImages[currentImageIndex];
  }

  document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  document.querySelector('.lightbox-prev').addEventListener('click', showPrevImage);
  document.querySelector('.lightbox-next').addEventListener('click', showNextImage);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrevImage();
    if (e.key === 'ArrowRight') showNextImage();
  });

  // ============================================================
  // 5b. ẢNH ĐẠI DIỆN & QR - BẤM ĐỂ XEM ẢNH LỚN
  // ============================================================
  document.querySelectorAll('.gift-avatar img, .gift-qr img, .family-photo img').forEach(img => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => openLightbox(img.src));
  });

  // ============================================================
  // 6. FORM RSVP - GỬI VÀO GOOGLE SHEET (tab "RSVP")
  // ============================================================
  rsvpForm.addEventListener('submit', handleRSVP);

  function handleRSVP(e) {
    e.preventDefault();

    const nameInput = document.getElementById('rsvp-name');
    const phoneInput = document.getElementById('guest-phone');
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const companionCount = document.getElementById('guest-count').value;

    // Kiểm tra dữ liệu
    if (!name) {
      showToast('Vui lòng nhập họ và tên.');
      nameInput.focus();
      return;
    }
    if (!phone || !/^[0-9]{9,11}$/.test(phone)) {
      showToast('Vui lòng nhập số điện thoại hợp lệ (9-11 chữ số).');
      phoneInput.focus();
      return;
    }

    const btnSubmit = document.getElementById('btn-rsvp');
    const btnText = btnSubmit.querySelector('.btn-text');
    const btnLoader = btnSubmit.querySelector('.btn-loader');

    // Hiện trạng thái đang gửi
    btnSubmit.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');

    const isAttending = document.querySelector('input[name="is_attending"]:checked')?.value === '1';

    const payload = {
      action: 'rsvp',
      guest_name: name,
      phone_number: phone,
      is_attending: isAttending,
      companion_count: parseInt(companionCount) || 0,
      type: wData.type || 1,
    };

    postToSheet(payload)
      .then(() => {
        showToast('Cảm ơn bạn! Xác nhận đã được ghi nhận 💕');
        rsvpForm.reset();
      })
      .catch(() => {
        showToast('Có lỗi xảy ra, vui lòng thử lại');
      })
      .finally(() => {
        btnSubmit.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
      });
  }

  // ============================================================
  // 7. SỔ LƯU BÚT - GỬI LỜI CHÚC VÀO GOOGLE SHEET (tab "LoiChuc")
  // ============================================================
  const guestbookForm = document.getElementById('guestbook-form');
  if (guestbookForm) {
    guestbookForm.addEventListener('submit', handleGuestbook);
  }

  function handleGuestbook(e) {
    e.preventDefault();

    const nameInput = document.getElementById('wish-name');
    const messageInput = document.getElementById('wish-message');
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!name) {
      showToast('Vui lòng nhập họ và tên');
      nameInput.focus();
      return;
    }
    if (!message) {
      showToast('Vui lòng nhập lời chúc của bạn.');
      messageInput.focus();
      return;
    }

    const btnSubmit = document.getElementById('btn-wish');
    const btnText = btnSubmit.querySelector('.btn-text');
    const btnLoader = btnSubmit.querySelector('.btn-loader');

    btnSubmit.disabled = true;
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');

    const payload = {
      action: 'wish',
      guest_name: name,
      wishes_message: message,
    };

    postToSheet(payload)
      .then(() => {
        addWishToWall(name, message);
        showToast('Cảm ơn lời chúc của bạn! 💕');
        guestbookForm.reset();
      })
      .catch(() => {
        showToast('Có lỗi xảy ra, vui lòng thử lại');
      })
      .finally(() => {
        btnSubmit.disabled = false;
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
      });
  }

  // ============================================================
  // 7b. TẢI DANH SÁCH LỜI CHÚC TỪ GOOGLE SHEET
  // ============================================================
  function loadWishes() {
    if (!wData.apiUrl) return;

    // GET đơn giản, không thêm headers để tránh preflight
    fetch(wData.apiUrl)
      .then(res => {
        if (!res.ok) throw new Error('Lỗi tải lời chúc');
        return res.json();
      })
      .then(data => {
        const wishes = data.wishes || [];
        const wishesList = document.getElementById('wishes-list');
        if (!wishesList) return;

        wishesList.innerHTML = '';

        if (wishes.length === 0) {
          wishesList.innerHTML = '<p style="text-align:center; color: var(--color-text-muted); padding: 20px;">Chưa có lời chúc nào. Hãy là người đầu tiên! 💕</p>';
          return;
        }

        wishes.forEach(w => {
          const card = document.createElement('div');
          card.className = 'wish-card';
          card.innerHTML = `
            <div class="wish-header">
              <p class="wish-author">${escapeHTML(w.guest_name)}</p>
              <p class="wish-date">${escapeHTML(w.created_at)}</p>
            </div>
            <p class="wish-text">${escapeHTML(w.wishes_message)}</p>
          `;
          wishesList.appendChild(card);
        });
      })
      .catch(err => {
        console.warn('Không tải được lời chúc:', err);
      });
  }

  // ============================================================
  // 7c. THÊM LỜI CHÚC MỚI LÊN TƯỜNG (KHÔNG CẦN TẢI LẠI TRANG)
  // ============================================================
  function addWishToWall(name, wish) {
    const wishesList = document.getElementById('wishes-list');
    if (!wishesList) return;

    // Xóa thông báo "chưa có lời chúc" nếu có
    const emptyMsg = wishesList.querySelector(':scope > p');
    if (emptyMsg) emptyMsg.remove();

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const formattedDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const card = document.createElement('div');
    card.className = 'wish-card';
    card.innerHTML = `
      <div class="wish-header">
        <p class="wish-author">${escapeHTML(name)}</p>
        <p class="wish-date">${formattedDate}</p>
      </div>
      <p class="wish-text">${escapeHTML(wish)}</p>
    `;
    wishesList.prepend(card);
  }

  // ============================================================
  // 8. PHONG BÌ LÌ XÌ (MỞ RA HIỆN QR MỪNG CƯỚI)
  // ============================================================
  const giftEnvelopeContainer = document.getElementById('gift-box-container');
  const giftGrid = document.getElementById('gift-grid');

  if (giftEnvelopeContainer && giftGrid) {
    giftEnvelopeContainer.addEventListener('click', () => {
      giftEnvelopeContainer.classList.add('opening');

      // Sau khi animation xong: ẩn phong bì, hiện lưới thông tin
      setTimeout(() => {
        giftEnvelopeContainer.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        giftEnvelopeContainer.style.opacity = '0';
        giftEnvelopeContainer.style.transform = 'translateY(-30px) scale(0.95)';

        setTimeout(() => {
          giftEnvelopeContainer.style.display = 'none';
          giftGrid.style.display = 'grid';

          if (typeof AOS !== 'undefined') {
            AOS.refresh();
          }
        }, 600);
      }, 1000);
    });
  }

  // ============================================================
  // 9. COPY SỐ TÀI KHOẢN
  // ============================================================
  document.querySelectorAll('.btn-copy').forEach(btn => {
    const defaultLabel = btn.textContent;

    btn.addEventListener('click', () => {
      const targetEl = document.getElementById(btn.getAttribute('data-target'));
      if (!targetEl) return;

      const stk = targetEl.textContent.trim();

      const onCopied = () => {
        btn.classList.add('Copied');
        btn.textContent = '✓ Đã copy';
        showToast('Đã copy STK: ' + stk);
        setTimeout(() => {
          btn.classList.remove('Copied');
          btn.textContent = defaultLabel;
        }, 2000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(stk).then(onCopied).catch(() => fallbackCopy(stk, onCopied));
      } else {
        fallbackCopy(stk, onCopied);
      }
    });
  });

  // Dự phòng cho trình duyệt không có clipboard API
  function fallbackCopy(text, onSuccess) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      onSuccess();
    } catch (_) {
      showToast('Không thể copy. Vui lòng copy thủ công.');
    }
    document.body.removeChild(textarea);
  }

  // ============================================================
  // 10. TẢI MÃ QR
  // ============================================================
  document.querySelectorAll('.btn-download-qr').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.getAttribute('data-qr-target');
      const qrImg = btn.closest('.gift-card').querySelector('.gift-qr img');

      if (!qrImg) return;

      try {
        const response = await fetch(qrImg.src);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR_${target === 'bride' ? 'Co_Dau' : 'Chu_Re'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast('Đã tải QR xuống máy!');
      } catch (error) {
        showToast('Không thể tải QR. Vui lòng thử lại.');
      }
    });
  });

  // ============================================================
  // 11. THANH ĐIỀU HƯỚNG - ĐÁNH DẤU MỤC ĐANG XEM
  // ============================================================
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.main-nav a');

  const sideDecors = document.querySelectorAll('.desktop-side-decor');
  const footer = document.querySelector('.footer');

  function onScroll() {
    // Ẩn chữ Song Hỷ hai bên khi cuộn tới chân trang
    if (footer) {
      const footerTop = footer.getBoundingClientRect().top;
      const threshold = window.innerHeight * 0.85;
      sideDecors.forEach(el => el.classList.toggle('hide-decor', footerTop < threshold));
    }

    const scrollY = window.scrollY + 120;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + id);
        });
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ============================================================
  // 12. HIỆU ỨNG HOA ANH ĐÀO RƠI (Canvas)
  // ============================================================
  const ctx = petalsCanvas.getContext('2d');
  let petals = [];
  let animationFrameId = null;
  let isPageVisible = true;

  function resizeCanvas() {
    petalsCanvas.width = window.innerWidth;
    petalsCanvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Tạm dừng khi tab bị ẩn (tiết kiệm pin và CPU)
  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    if (isPageVisible && petals.length > 0) {
      animatePetals();
    } else if (!isPageVisible && animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  });

  class Petal {
    constructor() {
      this.reset();
      this.y = Math.random() * petalsCanvas.height;
    }

    reset() {
      this.x = Math.random() * petalsCanvas.width;
      this.y = -20;
      this.size = Math.random() * 10 + 6;
      this.speedY = Math.random() * 1.2 + 0.5;
      this.speedX = Math.random() * 0.8 - 0.4;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.02;
      this.opacity = Math.random() * 0.4 + 0.3;
      this.wobble = Math.random() * 2;
      this.wobbleSpeed = Math.random() * 0.02 + 0.01;
      const hue = Math.floor(Math.random() * 20) + 340;
      const sat = Math.floor(Math.random() * 30) + 50;
      const light = Math.floor(Math.random() * 20) + 75;
      this.color = `hsla(${hue}, ${sat}%, ${light}%, ${this.opacity})`;
    }

    update() {
      this.y += this.speedY;
      this.x += this.speedX + Math.sin(this.wobble) * 0.5;
      this.wobble += this.wobbleSpeed;
      this.rotation += this.rotationSpeed;

      if (this.y > petalsCanvas.height + 20) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      // Vẽ cánh hoa bằng 2 đường cong bezier
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        this.size / 2, -this.size / 2,
        this.size, this.size / 4,
        0, this.size
      );
      ctx.bezierCurveTo(
        -this.size, this.size / 4,
        -this.size / 2, -this.size / 2,
        0, 0
      );
      ctx.fill();
      ctx.restore();
    }
  }

  function startPetals() {
    const petalCount = window.innerWidth < 768 ? 25 : 40;
    petals = [];
    for (let i = 0; i < petalCount; i++) {
      petals.push(new Petal());
    }
    animatePetals();
  }

  function animatePetals() {
    if (!isPageVisible) return;

    ctx.clearRect(0, 0, petalsCanvas.width, petalsCanvas.height);
    petals.forEach(petal => {
      petal.update();
      petal.draw();
    });
    animationFrameId = requestAnimationFrame(animatePetals);
  }

  // ============================================================
  // 13. PHÁO HOA (Fireworks)
  // ============================================================
  const fwCanvas = document.getElementById('fireworks-canvas');
  const fwCtx = fwCanvas.getContext('2d');
  let fwParticles = [];
  let fwRockets = [];
  let fwRunning = false;
  let fwLaunchTimer = null;

  function fwResize() {
    fwCanvas.width = window.innerWidth;
    fwCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', fwResize);

  // Màu pháo hoa thanh lịch, tone rose gold và pastel
  const FW_COLORS = [
    '#f5c842', '#f0a060', '#e87878', '#e8a0c8',
    '#c8a0e8', '#80c8f0', '#80e8c0', '#f0e080',
    '#f0b0a0', '#d4a0c8', '#a0c8e8', '#f8e8a0',
    '#ffffff', '#ffd6cc', '#ffe4b5', '#d4b5e0'
  ];

  class FwParticle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.decay = 0.012 + Math.random() * 0.016;
      this.gravity = 0.08;
      this.size = 1.5 + Math.random() * 2.5;
      this.trail = [];
      this.sparkle = Math.random() < 0.3;
    }

    update() {
      this.trail.push({ x: this.x, y: this.y, alpha: this.alpha });
      if (this.trail.length > 6) this.trail.shift();
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= 0.98;
      this.alpha -= this.decay;
    }

    draw(ctx) {
      // Vệt sáng phía sau
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        ctx.globalAlpha = (i / this.trail.length) * t.alpha * 0.4;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }

      ctx.globalAlpha = Math.max(this.alpha, 0);
      if (this.sparkle && Math.random() < 0.5) {
        // Hạt hình ngôi sao
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.random() * Math.PI);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const r = i % 2 === 0 ? this.size * 2 : this.size * 0.6;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  class FwRocket {
    constructor(side) {
      // side: 'left' hoặc 'right'
      this.x = side === 'left'
        ? 60 + Math.random() * 80
        : fwCanvas.width - 60 - Math.random() * 80;
      this.y = fwCanvas.height;
      this.vy = -(9 + Math.random() * 6);
      this.vx = (side === 'left' ? 1 : -1) * (0.3 + Math.random() * 1.2);
      this.targetY = fwCanvas.height * (0.12 + Math.random() * 0.32);
      this.color = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
      this.exploded = false;
      this.trail = [];
      this.size = 2.5;
    }

    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 10) this.trail.shift();
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.12; // trọng lực làm chậm dần
      if (this.y <= this.targetY) {
        this.exploded = true;
        this.explode();
      }
    }

    explode() {
      const count = 45 + Math.floor(Math.random() * 25);
      const color1 = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
      const color2 = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
      for (let i = 0; i < count; i++) {
        fwParticles.push(new FwParticle(this.x, this.y, Math.random() < 0.6 ? color1 : color2));
      }
      // Vòng sáng trắng
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const p = new FwParticle(this.x, this.y, '#ffffff');
        const s = 4.5;
        p.vx = Math.cos(a) * s;
        p.vy = Math.sin(a) * s;
        fwParticles.push(p);
      }
    }

    draw(ctx) {
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        ctx.globalAlpha = (i / this.trail.length) * 0.7;
        ctx.beginPath();
        ctx.arc(t.x, t.y, this.size * (i / this.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = '#fff8e8';
      ctx.fill();
    }
  }

  function launchRocket() {
    if (!fwRunning) return;
    fwRockets.push(new FwRocket('left'));
    fwRockets.push(new FwRocket('right'));
    // Lần bắn kế tiếp sau 1.2 - 2.4 giây
    const delay = 1200 + Math.random() * 1200;
    fwLaunchTimer = setTimeout(launchRocket, delay);
  }

  function fwAnimate() {
    if (!fwRunning && fwParticles.length === 0 && fwRockets.length === 0) {
      fwCanvas.style.opacity = '0';
      return;
    }
    requestAnimationFrame(fwAnimate);
    fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);

    fwRockets = fwRockets.filter(r => !r.exploded);
    fwRockets.forEach(r => { r.update(); r.draw(fwCtx); });

    fwParticles = fwParticles.filter(p => p.alpha > 0.01);
    fwParticles.forEach(p => { p.update(); p.draw(fwCtx); });
  }

  function startFireworks() {
    fwResize();
    fwRunning = true;
    fwCanvas.style.opacity = '1';
    fwParticles = [];
    fwRockets = [];
    setTimeout(launchRocket, 400);
    fwAnimate();
    // Ngừng bắn sau 8 giây, để các hạt còn lại tan dần
    setTimeout(() => {
      fwRunning = false;
      clearTimeout(fwLaunchTimer);
    }, 8000);
  }

  // ============================================================
  // 14. THÔNG BÁO NHỎ (TOAST)
  // ============================================================
  let toastTimer = null;

  function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // ============================================================
  // 15. HÀM PHỤ - CHỐNG XSS
  // ============================================================
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str ?? '')));
    return div.innerHTML;
  }
});