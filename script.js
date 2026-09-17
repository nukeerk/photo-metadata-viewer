(function(){
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const stage = document.getElementById('stage');
  const preview = document.getElementById('preview');
  const fname = document.getElementById('fname');
  const fmeta = document.getElementById('fmeta');
  const groupsEl = document.getElementById('groups');
  const dzText = document.getElementById('dzText');
  const resetBtn = document.getElementById('resetBtn');
  const geoBtn = document.getElementById('geoBtn');
  const geoStatus = document.getElementById('geoStatus');

  let currentGeo = null; // {lat, lon, accuracy, timestamp}

  function sprockets(el, n){
    el.innerHTML = '';
    for(let i=0;i<n;i++){
      const s = document.createElement('span');
      el.appendChild(s);
    }
  }
  function fillSprockets(){
    const n = Math.max(10, Math.floor(window.innerWidth / 30));
    sprockets(document.getElementById('sprocketsTop'), n);
    sprockets(document.getElementById('sprocketsBottom'), n);
  }
  fillSprockets();
  window.addEventListener('resize', fillSprockets);

  ['dragenter','dragover'].forEach(evt=>{
    dropzone.addEventListener(evt, e=>{
      e.preventDefault();
      dropzone.classList.add('drag');
    });
  });
  ['dragleave','drop'].forEach(evt=>{
    dropzone.addEventListener(evt, e=>{
      e.preventDefault();
      dropzone.classList.remove('drag');
    });
  });
  dropzone.addEventListener('drop', e=>{
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) handleFile(f);
  });
  fileInput.addEventListener('change', e=>{
    const f = e.target.files && e.target.files[0];
    if(f) handleFile(f);
  });
  resetBtn.addEventListener('click', ()=>{
    stage.classList.remove('show');
    fileInput.value = '';
    dzText.textContent = 'Перетащите фотографию сюда или нажмите, чтобы выбрать файл';
  });

  // Geolocation
  function updateGeoStatus(statusHTML){
    geoStatus.innerHTML = statusHTML;
  }

  geoBtn.addEventListener('click', requestGeoLocation);

  function requestGeoLocation(){
    if(!navigator.geolocation){
      updateGeoStatus('<span class="error">⚠ Геолокация не поддерживается вашим браузером</span>');
      return;
    }

    geoBtn.disabled = true;
    geoBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round"/>
      </svg>
      Определение местоположения...`; 
    updateGeoStatus('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const timestamp = new Date(position.timestamp).toLocaleString('ru-RU', {
          day:'2-digit', month:'2-digit', year:'numeric',
          hour:'2-digit', minute:'2-digit', second:'2-digit'
        });

        currentGeo = { lat, lon, accuracy, timestamp };

        updateGeoStatus(`
          <div>Местоположение определено:</div>
          <div class="coord">${lat.toFixed(6)}, ${lon.toFixed(6)}</div>
          <div>Точность: ±${accuracy.toFixed(0)} м</div>
          <div>Время: ${timestamp}</div>
          <button class="reset-link" id="clearGeoBtn" style="margin-top:8px;">✕ очистить</button>
        `);

        geoBtn.disabled = false;
        geoBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round"/>
          </svg>
          Обновить местоположение
        `;

        document.getElementById('clearGeoBtn').addEventListener('click', (e) => {
          e.stopPropagation();
          currentGeo = null;
          updateGeoStatus('');
          geoBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round"/>
            </svg>
            Определить моё местоположение
          `;
        });
      },
      (error) => {
        let msg = 'Не удалось определить местоположение';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            msg = '⚠ Доступ к геолокации запрещён. Разрешите доступ в настройках браузера.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = '⚠ Информация о местоположении недоступна.';
            break;
          case error.TIMEOUT:
            msg = '⚠ Превышено время ожидания ответа.';
            break;
        }
        updateGeoStatus(`<span class="error">${msg}</span>`);
        geoBtn.disabled = false;
        geoBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round"/>
          </svg>
          Определить моё местоположение
        `;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  function formatBytes(bytes){
    if(bytes === 0) return '0 Б';
    const units = ['Б','КБ','МБ','ГБ'];
    const i = Math.floor(Math.log(bytes)/Math.log(1024));
    return (bytes/Math.pow(1024,i)).toFixed(i===0?0:1) + ' ' + units[i];
  }

  function formatDate(d){
    try{
      return new Date(d).toLocaleString('ru-RU', {
        day:'2-digit', month:'2-digit', year:'numeric',
        hour:'2-digit', minute:'2-digit', second:'2-digit'
      });
    }catch(e){ return String(d); }
  }

  function dmsToDecimal(dms, ref){
    if(!dms || dms.length < 3) return null;
    let deg = dms[0] + dms[1]/60 + dms[2]/3600;
    if(ref === 'S' || ref === 'W') deg = -deg;
    return deg;
  }

  function exposureFraction(v){
    if(v == null) return null;
    if(v >= 1) return v.toFixed(1) + ' с';
    const denom = Math.round(1/v);
    return '1/' + denom + ' с';
  }

  function addGroup(title, rows){
    if(!rows || rows.length === 0) return;
    const g = document.createElement('div');
    g.className = 'group';
    const h = document.createElement('h2');
    h.innerHTML = '<span>'+title+'</span><span class="count">'+rows.length+'</span>';
    g.appendChild(h);
    rows.forEach(([k,v])=>{
      if(v === undefined || v === null || v === '') return;
      const row = document.createElement('div');
      row.className = 'row';
      const kEl = document.createElement('div');
      kEl.className = 'k';
      kEl.textContent = k;
      const vEl = document.createElement('div');
      vEl.className = 'v';
      if(v instanceof Node){
        vEl.appendChild(v);
      } else {
        vEl.textContent = v;
      }
      row.appendChild(kEl);
      row.appendChild(vEl);
      g.appendChild(row);
    });
    groupsEl.appendChild(g);
  }

  function handleFile(file){
    if(!file.type.startsWith('image/')){
      alert('Пожалуйста, выберите файл изображения.');
      return;
    }

    const url = URL.createObjectURL(file);
    preview.src = url;
    fname.textContent = file.name || '(без имени)';
    fmeta.textContent = (file.type || 'неизвестный тип') + ' · ' + formatBytes(file.size);

    groupsEl.innerHTML = '';
    stage.classList.add('show');

    // File info group
    const fileRows = [
      ['Имя файла', file.name || '—'],
      ['Тип MIME', file.type || '—'],
      ['Размер', formatBytes(file.size)],
      ['Изменён', file.lastModified ? formatDate(file.lastModified) : '—'],
    ];

    // Dimensions once image loads
    const imgForDims = new Image();
    imgForDims.onload = function(){
      addGroup('Файл', fileRows.concat([
        ['Разрешение', imgForDims.naturalWidth + ' × ' + imgForDims.naturalHeight + ' px'],
        ['Соотношение сторон', (imgForDims.naturalWidth/imgForDims.naturalHeight).toFixed(3)]
      ]));
      readExif(file);
    };
    imgForDims.onerror = function(){
      addGroup('Файл', fileRows);
      readExif(file);
    };
    imgForDims.src = url;
  }

  function readExif(file){
    if(typeof EXIF === 'undefined'){
      addGroup('EXIF', []);
      const note = document.createElement('div');
      note.className = 'warn';
      note.textContent = 'Библиотека чтения EXIF не загрузилась (нет соединения с CDN). Показаны только файловые данные.';
      groupsEl.appendChild(note);
      return;
    }

    EXIF.getData(file, function(){
      const all = EXIF.getAllTags(this);

      if(!all || Object.keys(all).length === 0){
        const note = document.createElement('div');
        note.className = 'warn';
        note.textContent = '⚠ EXIF-данные не найдены в этом файле (часто бывает для PNG, WebP, скриншотов или фото, прошедших через мессенджеры/соцсети). Геоданные требуются в EXIF.';
        groupsEl.appendChild(note);
        return;
      }

      // Camera
      addGroup('Камера', [
        ['Производитель', all.Make],
        ['Модель', all.Model],
        ['Объектив', all.LensModel],
        ['ПО', all.Software],
      ]);

      // Exposure / shooting settings
      addGroup('Съёмка', [
        ['Дата съёмки', all.DateTimeOriginal || all.DateTime],
        ['Выдержка', exposureFraction(all.ExposureTime)],
        ['Диафрагма', all.FNumber ? 'f/' + all.FNumber : null],
        ['ISO', all.ISOSpeedRatings],
        ['Фокусное расстояние', all.FocalLength ? all.FocalLength + ' мм' : null],
        ['Экспокоррекция', (all.ExposureBiasValue !== undefined) ? all.ExposureBiasValue + ' EV' : null],
        ['Вспышка', all.Flash !== undefined ? (all.Flash % 2 === 1 ? 'сработала' : 'не сработала') : null],
        ['Баланс белого', all.WhiteBalance === 0 ? 'авто' : (all.WhiteBalance === 1 ? 'ручной' : null),],
        ['Ориентация', all.Orientation],
      ]);

      // GPS
      let gpsRows = [];
      const gpsDebug = [
        ['GPSLatitude (сырой)', all.GPSLatitude],
        ['GPSLatitudeRef', all.GPSLatitudeRef],
        ['GPSLongitude (сырой)', all.GPSLongitude],
        ['GPSLongitudeRef', all.GPSLongitudeRef],
        ['GPSAltitude', all.GPSAltitude !== undefined ? all.GPSAltitude + ' м' : null],
        ['GPSAltitudeRef', all.GPSAltitudeRef !== undefined ? (all.GPSAltitudeRef === 0 ? 'над уровнем моря' : 'ниже уровня моря') : null],
      ];

      if(all.GPSLatitude && all.GPSLongitude){
        const lat = dmsToDecimal(all.GPSLatitude, all.GPSLatitudeRef);
        const lon = dmsToDecimal(all.GPSLongitude, all.GPSLongitudeRef);

        // Сырые координаты в формате DMS
        const latDMS = all.GPSLatitude.map(v => v.numerator !== undefined ? v.numerator + '/' + v.denominator : v).join(', ') + '° ' +
          (all.GPSLatitudeRef || '?') + ' ' + (all.GPSLatitudeRef || '');
        const lonDMS = all.GPSLongitude.map(v => v.numerator !== undefined ? v.numerator + '/' + v.denominator : v).join(', ') + '° ' +
          (all.GPSLongitudeRef || '?') + ' ' + (all.GPSLongitudeRef || '');
        gpsRows.push(['Широта (DMS)', latDMS]);
        gpsRows.push(['Долгота (DMS)', lonDMS]);

        if(lat !== null && lon !== null){
          const link = document.createElement('a');
          link.href = 'https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lon+'#map=15/'+lat+'/'+lon;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = lat.toFixed(6) + ', ' + lon.toFixed(6);
          gpsRows.push(['Координаты (10-й формат)', link]);
        } else {
          const reasons = [];
          if(lat === null) reasons.push('широта');
          if(lon === null) reasons.push('долгота');
          gpsRows.push(['Статус', 'Не удалось преобразовать: ' + reasons.join(', ') + ' отсутствует или неверный формат']);
        }
        if(all.GPSAltitude !== undefined){
          gpsRows.push(['Высота', all.GPSAltitude.toFixed ? all.GPSAltitude.toFixed(1) + ' м' : all.GPSAltitude + ' м']);
        }
      }

      // Добавляем группу геоданных (если есть данные)
      if(gpsRows.length > 0) {
        addGroup('Геоданные', gpsRows);
      }

      // Добавляем отладочную информацию GPS (всегда, даже если пусто)
      const debugG = document.createElement('div');
      debugG.className = 'group';
      const presentCount = gpsDebug.filter(([k,v]) => v !== undefined && v !== null).length;
      const debugH = document.createElement('h2');
      debugH.innerHTML = '<span>⚙ Геоданные (отладка)</span><span class="count">' + presentCount + '/' + gpsDebug.length + '</span>';
      debugG.appendChild(debugH);
      gpsDebug.forEach(([k,v])=>{
        const row = document.createElement('div');
        row.className = 'row';
        const kEl = document.createElement('div');
        kEl.className = 'k';
        kEl.textContent = k;
        const vEl = document.createElement('div');
        vEl.className = 'v';
        if(v === undefined || v === null || v === '') {
          vEl.style.color = 'var(--red)';
          vEl.textContent = '— отсутствует';
        } else {
          vEl.style.color = 'var(--amber-dim)';
          vEl.textContent = v;
        }
        row.appendChild(kEl);
        row.appendChild(vEl);
        debugG.appendChild(row);
      });
      groupsEl.appendChild(debugG);

      // Raw / other tags toggle
      const rawKeys = Object.keys(all);
      if(rawKeys.length){
        const toggleWrap = document.createElement('div');
        const toggle = document.createElement('div');
        toggle.className = 'raw-toggle';
        toggle.textContent = '▸ показать все ' + rawKeys.length + ' необработанных тегов';
        const box = document.createElement('div');
        box.className = 'raw-box';
        const lines = rawKeys.sort().map(k=>{
          let val = all[k];
          if(val && val.numerator !== undefined) val = val.numerator + '/' + val.denominator;
          if(Array.isArray(val)) val = val.join(', ');
          return k + ': ' + val;
        });
        box.textContent = lines.join('\n');
        toggle.addEventListener('click', ()=>{
          const isShown = box.classList.toggle('show');
          toggle.textContent = (isShown ? '▾ скрыть' : '▸ показать все ') + (isShown ? '' : rawKeys.length + ' необработанных тегов');
        });
        toggleWrap.appendChild(toggle);
        toggleWrap.appendChild(box);
        groupsEl.appendChild(toggleWrap);
      }
    });
  }
})();
