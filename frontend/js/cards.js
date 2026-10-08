function eventCardHTML(e) {
  const favClass = e.isFavorite ? "active" : "";
  const favIcon = e.isFavorite ? "❤️" : "🤍";
  const liveBadge = e.isLive
    ? `<span class="badge badge-red">Live</span>`
    : `<span class="badge badge-yellow">${e.category}</span>`;
  return `
    <div class="event-card">
      <div class="thumb" style="background-image:url('${e.image}')">
        ${liveBadge}
        <div class="fav-btn ${favClass}" data-id="${e.id}">${favIcon}</div>
      </div>
      <div class="body">
        <div class="title">${e.title}</div>
        <div class="meta">📍 ${e.venue} &nbsp;•&nbsp; ${formatDate(e.date)}</div>
        <div class="foot">
          <span class="price">${formatCurrency(e.minPrice)}</span>
          <a class="btn btn-yellow btn-sm" href="event-details.html?id=${e.id}">Book Ticket →</a>
        </div>
      </div>
    </div>`;
}
