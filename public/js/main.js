
const hookTripsCatalog = async () => {
    const listEl = document.getElementById('trips-list');
    const templateEl = document.getElementById('trip-card-template');
    const regionSelect = document.getElementById('region-filter');
    const seasonSelect = document.getElementById('season-filter');
    const searchInput = document.getElementById('trip-search');
    const errorEl = document.getElementById('trips-error');
    const emptyEl = document.getElementById('trips-empty');
    const previousButton = document.getElementById('trips-previous');
    const nextButton = document.getElementById('trips-next');
    const pageIndicator = document.getElementById('trips-page-indicator');

    if (
        !listEl
        || !templateEl
        || !regionSelect
        || !seasonSelect
        || !searchInput
        || !previousButton
        || !nextButton
        || !pageIndicator
    ) {
        return;
    }

    let currentPage = 1;
    let totalPages = 1;
    let isLoading = false;
    let filtersInitialized = false;
    let activeRequest;

    const renderTrips = (trips) => {
        const fragment = document.createDocumentFragment();

        trips.forEach((trip) => {
            const card = templateEl.content.cloneNode(true);
            const cardEl = card.querySelector('.route-card');

            cardEl.classList.add(
                trip.region.toLowerCase().replace(/\s+/g, '-')
            );

            card.querySelector('[data-field="name"]').textContent = trip.name;
            card.querySelector('[data-field="start"]').textContent = trip.startStation;
            card.querySelector('[data-field="end"]').textContent = trip.endStation;
            card.querySelector('[data-field="duration"]').textContent = trip.duration;
            card.querySelector('[data-field="distance"]').textContent = trip.distance;

            const seasonEl = card.querySelector('[data-field="season"]');
            seasonEl.textContent = `Best in ${trip.bestSeason}`;
            seasonEl.classList.add(
                `season-${trip.bestSeason.toLowerCase().replace(/\s+/g, '-')}`
            );

            card.querySelector('[data-field="description"]').textContent = trip.description;

            card.querySelector('[data-field="details"]').href =
                `/trips/${encodeURIComponent(trip.id)}`;

            trip.highlights.forEach((highlight) => {
                const tag = document.createElement('span');
                tag.className = 'highlight-tag';
                tag.textContent = highlight;

                card.querySelector('[data-field="highlights"]').append(tag);
            });

            fragment.append(card);
        });

        listEl.replaceChildren(fragment);
        emptyEl.hidden = trips.length > 0;
    };

    const updatePagination = () => {
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
        previousButton.disabled = isLoading || currentPage === 1;
        nextButton.disabled = isLoading || currentPage === totalPages;
    };

    const populateFilters = (trips) => {
        const regions = [
            ...new Set(trips.map((trip) => trip.region))
        ].sort();

        const seasons = [
            ...new Set(trips.map((trip) => trip.bestSeason))
        ].sort();

        regions.forEach((region) => {
            const option = new Option(
                region.charAt(0).toUpperCase() + region.slice(1),
                region
            );

            regionSelect.append(option);
        });

        seasons.forEach((season) => {
            const option = new Option(
                season.charAt(0).toUpperCase() + season.slice(1),
                season
            );

            seasonSelect.append(option);
        });
    };

    const loadTrips = async (page) => {
        if (activeRequest) {
            activeRequest.abort();
        }

        activeRequest = new AbortController();
        const requestSignal = activeRequest.signal;
        isLoading = true;
        updatePagination();

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: '10'
            });

            if (regionSelect.value !== 'all') {
                params.set('region', regionSelect.value);
            }

            if (seasonSelect.value !== 'all') {
                params.set('season', seasonSelect.value);
            }

            if (searchInput.value.trim()) {
                params.set('search', searchInput.value.trim());
            }

            const response = await fetch(`/api/trips?${params}`, {
                signal: requestSignal
            });

            if (!response.ok) {
                throw new Error(`Failed to load trips (${response.status})`);
            }

            const payload = await response.json();
            currentPage = payload.page;
            totalPages = payload.totalPages;

            if (!filtersInitialized) {
                populateFilters(payload.trips);
                filtersInitialized = true;
            }

            renderTrips(payload.trips);
            errorEl.hidden = true;
        } catch (error) {
            if (error.name === 'AbortError') {
                return;
            }

            console.error('Unable to load trips:', error);
            errorEl.hidden = false;
        } finally {
            if (!requestSignal.aborted) {
                isLoading = false;
                updatePagination();
            }
        }
    };

    regionSelect.addEventListener('change', () => loadTrips(1));
    seasonSelect.addEventListener('change', () => loadTrips(1));
    searchInput.addEventListener('input', () => loadTrips(1));
    previousButton.addEventListener('click', () => loadTrips(currentPage - 1));
    nextButton.addEventListener('click', () => loadTrips(currentPage + 1));

    loadTrips(1);
};

const hookTrainsCatalog = async () => {
    const listEl = document.getElementById('trains-list');
    const templateEl = document.getElementById('train-card-template');
    const loadingEl = document.getElementById('trains-loading');
    const errorEl = document.getElementById('trains-error');

    if (!listEl || !templateEl) {
        return;
    }

    try {
        const response = await fetch('/api/trains');

        if (!response.ok) {
            throw new Error(`Failed to load trains (${response.status})`);
        }

        const payload = await response.json();
        const trains = payload.trains || [];
        const fragment = document.createDocumentFragment();

        trains.forEach((train) => {
            const card = templateEl.content.cloneNode(true);
            const imageEl = card.querySelector('[data-field="image"]');

            imageEl.src = train.imageUrl;
            imageEl.alt = train.imageAlt || `${train.name} train`;

            card.querySelector('[data-field="name"]').textContent = train.name;
            card.querySelector('[data-field="operator"]').textContent = train.operator;
            card.querySelector('[data-field="type"]').textContent = train.type;
            card.querySelector('[data-field="speed"]').textContent =
                `${train.maxSpeedKmh} km/h`;
            card.querySelector('[data-field="seats"]').textContent =
                `${train.capacity} seats`;
            card.querySelector('[data-field="power"]').textContent = train.powerSource;
            card.querySelector('[data-field="description"]').textContent = train.description;
            card.querySelector('[data-field="best-for"]').textContent = train.bestFor;

            fragment.appendChild(card);
        });

        listEl.replaceChildren(fragment);

        if (loadingEl) {
            loadingEl.hidden = true;
        }
    } catch (error) {
        console.error('Unable to load trains:', error);

        if (loadingEl) {
            loadingEl.hidden = true;
        }

        if (errorEl) {
            errorEl.hidden = false;
            errorEl.textContent =
                'Unable to load trains right now. Please try again in a moment.';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    hookTripsCatalog();
    hookTrainsCatalog();
});
