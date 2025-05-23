const API_KEY = 'd1b597081cb3443289e941710134abca';
const API_URL = 'https://api.rawg.io/api/games';

const searchInput = document.getElementById('gameInput');
const searchBtn = document.getElementById('searchBtn');
const searchForm = document.querySelector('.search-form');
const result = document.getElementById('result');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const genreSidebar = document.getElementById('genreSidebar');
const loadingSpinner = document.getElementById('loading');
const errorContainer = document.getElementById('error-message');
const noResults = document.getElementById('no-results');
const resultsTitle = document.getElementById('results-title');
const resultsCount = document.getElementById('results-count');
const backToTopBtn = document.getElementById('backToTop');

let currentPage = 1;
let currentQuery = '';
let currentGenre = '';
let totalResults = 0;
let isLoading = false;
let hasMoreResults = true;

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const showLoading = (show = true) => {
  loadingSpinner.style.display = show ? 'flex' : 'none';
  loadingSpinner.setAttribute('aria-hidden', !show);
};

const showError = (message) => {
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
  setTimeout(() => {
    errorContainer.style.display = 'none';
  }, 5000);
};

const updateResultsHeader = (query, genre, count) => {
  if (query) {
    resultsTitle.textContent = `Search results for "${query}"`;
  } else if (genre) {
    const genreBtn = document.querySelector(`button[data-genre="${genre}"]`);
    const genreName = genreBtn ? genreBtn.textContent : genre;
    resultsTitle.textContent = `${genreName} Games`;
  } else {
    resultsTitle.textContent = 'Featured Games';
  }
  resultsCount.textContent = count > 0 ? `${count} games found` : '';
};

const updateLoadMoreBtn = (loading = false) => {
  const btnText = loadMoreBtn.querySelector('.btn-text');
  const btnLoading = loadMoreBtn.querySelector('.btn-loading');

  if (loading) {
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';
    loadMoreBtn.disabled = true;
  } else {
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    loadMoreBtn.disabled = false;
  }

  loadMoreBtn.style.display = hasMoreResults ? 'block' : 'none';
};

async function fetchGames(query = '', page = 1, genre = '') {
  try {
    let url = `${API_URL}?key=${API_KEY}&page=${page}&page_size=12`;
    if (query) url += `&search=${encodeURIComponent(query)}`;
    if (genre) url += `&genres=${genre}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();
    totalResults = data.count || 0;
    hasMoreResults = !!data.next;

    return data.results || [];
  } catch (error) {
    console.error('Error fetching games:', error);
    showError('Failed to fetch games. Please try again.');
    return [];
  }
}

function createCard(game) {
  const card = document.createElement('article');
  card.className = 'game-card';
  card.style.cursor = 'pointer';
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `View details for ${game.name}`);

  const title = document.createElement('h3');
  title.textContent = game.name;

  const release = document.createElement('p');
  release.innerHTML = `<strong>Released:</strong> ${game.released || 'TBA'}`;

  const rating = document.createElement('p');
  const ratingValue = game.rating ? `${game.rating}/5` : 'Not rated';
  rating.innerHTML = `<strong>Rating:</strong> ${ratingValue}`;

  const platforms = document.createElement('p');
  const platNames = game.platforms?.slice(0, 3).map(p => p.platform.name).join(', ') || 'Multiple platforms';
  platforms.innerHTML = `<strong>Platforms:</strong> ${platNames}`;

  const image = document.createElement('img');
  image.src = game.background_image || '/placeholder-game.jpg';
  image.alt = `${game.name} screenshot`;
  image.loading = 'lazy';
  image.onerror = () => {
    image.src = '/placeholder-game.jpg';
    image.alt = 'Game image not available';
  };

  card.append(title, release, rating, platforms, image);

  const handleClick = () => showGameDetails(game.id);
  card.addEventListener('click', handleClick);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  });

  return card;
}

async function showGameDetails(gameId) {
  showLoading(true);
  loadMoreBtn.style.display = 'none';

  try {
    const detailUrl = `${API_URL}/${gameId}?key=${API_KEY}`;
    const screenshotsUrl = `${API_URL}/${gameId}/screenshots?key=${API_KEY}`;

    const [gameRes, screenshotsRes] = await Promise.all([
      fetch(detailUrl),
      fetch(screenshotsUrl),
    ]);

    if (!gameRes.ok) throw new Error('Failed to fetch game details');

    const gameData = await gameRes.json();
    const screenshotsData = screenshotsRes.ok ? await screenshotsRes.json() : { results: [] };

    result.innerHTML = '';
    showLoading(false);

    const detailCard = document.createElement('article');
    detailCard.className = 'game-card game-detail';

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to Search';
    backBtn.className = 'back-btn';
    backBtn.addEventListener('click', () => {
      location.reload();
    });

    const trailer = gameData.clip?.clip
      ? `<video width="100%" controls src="${gameData.clip.clip}" style="border-radius: var(--radius-sm); margin: 15px 0;"></video>`
      : '';

    const swiperHTML = `
      <div class="swiper-container" style="margin-top: 20px; width: 100%;">
        <div class="swiper-wrapper">
          ${screenshotsData.results.map(ss => `
            <div class="swiper-slide" style="display: flex; justify-content: center; align-items: center; height: 600px;">
              <img src="${ss.image}" alt="Game screenshot" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm);" loading="lazy" />
            </div>
          `).join('')}
        </div>
        <div class="swiper-pagination"></div>
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
      </div>
    `;

    const genres = gameData.genres?.map(g => g.name).join(', ') || 'Not specified';
    const developers = gameData.developers?.map(d => d.name).join(', ') || 'Unknown';
    const publishers = gameData.publishers?.map(p => p.name).join(', ') || 'Unknown';

    detailCard.innerHTML = `
      <h2>${gameData.name}</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
        <p><strong>Released:</strong> ${gameData.released || 'TBA'}</p>
        <p><strong>Rating:</strong> ${gameData.rating || 'Not rated'}/5</p>
        <p><strong>Genres:</strong> ${genres}</p>
        <p><strong>Developer:</strong> ${developers}</p>
        <p><strong>Publisher:</strong> ${publishers}</p>
        <p><strong>Playtime:</strong> ${gameData.playtime || 0} hours avg</p>
      </div>
      ${trailer}
      ${swiperHTML}
      <div style="margin-top: 25px;">
        <h3 style="margin-bottom: 15px; color: var(--accent);">About</h3>
        <p style="line-height: 1.7; color: var(--text-light);">${gameData.description_raw || 'No description available.'}</p>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '30px';

    wrapper.appendChild(detailCard);
    wrapper.appendChild(backBtn);

    result.appendChild(wrapper);

    resultsTitle.textContent = `Game Details - ${gameData.name}`;
    resultsCount.textContent = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    new Swiper('.swiper-container', {
      loop: true,
      pagination: {
        el: '.swiper-pagination',
        clickable: true
      },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev'
      },
      spaceBetween: 20,
      grabCursor: true
    });

  } catch (error) {
    console.error('Error fetching game details:', error);
    showError('Failed to load game details. Please try again.');
    showLoading(false);
  }
}

function clearActiveGenres() {
  const allButtons = genreSidebar.querySelectorAll('button');
  allButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
  });
}

async function loadGenres() {
  try {
    const res = await fetch(`https://api.rawg.io/api/genres?key=${API_KEY}`);
    if (!res.ok) throw new Error('Failed to fetch genres');

    const data = await res.json();

    data.results.forEach(genre => {
      const btn = document.createElement('button');
      btn.textContent = genre.name;
      btn.setAttribute('data-genre', genre.slug);
      btn.setAttribute('aria-label', `Browse ${genre.name} games`);

      btn.addEventListener('click', () => {
        if (isLoading) return;

        result.innerHTML = '';
        currentQuery = '';
        currentGenre = genre.slug;
        currentPage = 1;
        searchInput.value = '';
        displayGames('', currentPage, currentGenre);

        clearActiveGenres();
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      });

      genreSidebar.appendChild(btn);
    });
  } catch (error) {
    console.error('Error loading genres:', error);
    showError('Failed to load genres.');
  }
}

async function displayGames(query = '', page = 1, genre = '', append = false) {
  if (isLoading) return;

  isLoading = true;

  if (!append) {
    showLoading(true);
    result.innerHTML = '';
    noResults.style.display = 'none';
  } else {
    updateLoadMoreBtn(true);
  }

  const games = await fetchGames(query, page, genre);

  showLoading(false);
  updateLoadMoreBtn(false);
  isLoading = false;

  if (games.length === 0 && !append) {
    noResults.style.display = 'block';
    updateResultsHeader(query, genre, 0);
    return;
  }

  games.forEach(game => {
    const card = createCard(game);
    result.appendChild(card);
  });

  if (!append) {
    updateResultsHeader(query, genre, totalResults);
  }

  result.setAttribute('aria-live', 'polite');
}

const performSearch = () => {
  const query = searchInput.value.trim();
  if (query === currentQuery && !currentGenre) return;

  result.innerHTML = '';
  currentQuery = query;
  currentPage = 1;
  currentGenre = '';
  clearActiveGenres();
  displayGames(currentQuery, currentPage);
};

const debouncedSearch = debounce(performSearch, 300);

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  performSearch();
});

searchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  performSearch();
});

searchInput.addEventListener('input', debouncedSearch);

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    searchInput.blur();
  }
});

loadMoreBtn.addEventListener('click', () => {
  if (isLoading || !hasMoreResults) return;

  currentPage++;
  displayGames(currentQuery, currentPage, currentGenre, true);

  setTimeout(() => {
    const newCards = result.querySelectorAll('.game-card');
    const lastCard = newCards[newCards.length - 1];
    if (lastCard) {
      lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 500);
});

window.addEventListener('scroll', () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  if (scrollTop > 300) {
    backToTopBtn.style.display = 'block';
  } else {
    backToTopBtn.style.display = 'none';
  }
});

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    searchInput.focus();
  }

  if (e.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.blur();
  }
});

const initializeApp = async () => {
  showLoading(true);

  try {
    await Promise.all([
      loadGenres(),
      displayGames()
    ]);
  } catch (error) {
    console.error('Error initializing app:', error);
    showError('Failed to initialize the application.');
  }

  showLoading(false);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
