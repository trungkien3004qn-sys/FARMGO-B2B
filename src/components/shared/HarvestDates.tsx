const formatDate = (value: string) => value.slice(0, 10).split('-').reverse().join('/');

export function HarvestDates({ postedAt, harvestDate }: { postedAt: string; harvestDate: string }) {
  return <div className="harvest-dates">
    <span>Ngày đăng <time dateTime={postedAt}>{formatDate(postedAt)}</time></span>
    <span className="harvest-date-highlight"><span aria-hidden="true">🌱</span> Thu hoạch dự kiến <strong><time dateTime={harvestDate}>{formatDate(harvestDate)}</time></strong></span>
  </div>;
}
