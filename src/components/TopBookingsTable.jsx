import React from 'react';
import { formatCurrency } from '../utils/dataProcessor';

const TopBookingsTable = ({ topBookings }) => {
  if (!topBookings || topBookings.length === 0) return null;

  return (
    <div>
      <h2 className="card-title">Top Bookings</h2>
      <p className="card-subtitle">Largest individual bookings by converted amount.</p>
      
      <table className="top-bookings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Amount</th>
            <th>EMI/Month</th>
            <th>Tenure</th>
            <th>ROI</th>
          </tr>
        </thead>
        <tbody>
          {topBookings.map((booking, index) => (
            <tr key={index}>
              <td>
                <span className={`rank-badge${index < 3 ? ' top-3' : ''}`}>
                  {index + 1}
                </span>
              </td>
              <td style={{ fontWeight: 600 }}>{formatCurrency(booking.amount)}</td>
              <td>{formatCurrency(booking.emi)}</td>
              <td>{booking.tenure}M</td>
              <td>{booking.roi.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TopBookingsTable;
