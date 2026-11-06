document.addEventListener('DOMContentLoaded', function () {
	const mapBlock = document.querySelector('.js-lazy-yandex-map');

	if (!mapBlock) {
		return;
	}

	let mapLoaded = false;
	let mapVisible = false;

	function showPlaceholder(message) {
		const placeholder = document.createElement('div');
		placeholder.className = 'contacts-map__placeholder';
		const text = document.createElement('span');
		text.textContent = message;
		placeholder.appendChild(text);
		mapBlock.replaceChildren(placeholder);
	}

	function loadMap() {
		const mapUrl = mapBlock.getAttribute('data-map');
		if (!mapVisible) {
			return;
		}

		if (!mapUrl) {
			showPlaceholder('Карта для этого города пока не добавлена.');
			mapLoaded = false;
			return;
		}

		mapBlock.replaceChildren();
		const script = document.createElement('script');
		script.src = mapUrl;
		script.async = true;
		script.onerror = function () {
			mapLoaded = false;
			showPlaceholder('Не удалось загрузить карту. Свяжитесь с нами по телефону.');
		};
		mapBlock.appendChild(script);
		mapLoaded = true;
	}

	if ('IntersectionObserver' in window) {
		const observer = new IntersectionObserver(function (entries, observerInstance) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					mapVisible = true;
					loadMap();
					observerInstance.unobserve(mapBlock);
				}
			});
		}, { root: null, rootMargin: '350px 0px', threshold: 0 });

		observer.observe(mapBlock);
	} else {
		mapVisible = true;
		loadMap();
	}

	document.addEventListener('mpto:city-change', function (event) {
		const nextMap = event.detail && event.detail.mapUrl ? event.detail.mapUrl : '';
		mapBlock.setAttribute('data-map', nextMap);
		if (mapLoaded || mapVisible) {
			mapLoaded = false;
			loadMap();
		}
	});
});
