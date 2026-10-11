import './FestivalCouponLoader.css'

export const FestivalCouponLoader = ({ label = 'Loading festival coupons...' }) => (
  <div className="festival-coupon-loader" role="status" aria-live="polite">
    <span className="festival-coupon-loader-spinner" aria-hidden="true" />
    <strong>{label}</strong>
  </div>
)
