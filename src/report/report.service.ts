import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { Property } from '../property/entities/property.entity';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { differenceInDays } from 'date-fns';
@Injectable()
export class ReportService {


  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}
  /* istanbul ignore next */
  async generateOccupancyReport() {
    console.log('generating report')
    const properties = await this.propertyRepository.find();
    if (!properties.length) {
      console.error('No properties found');
      return [];
    }
  
    const reports = await Promise.all(properties.map(async (property) => {
      if (!property.rooms || property.rooms <= 0) {
        console.error(`Invalid number of rooms for property ${property.id}`);
        return null; // Skip this property if rooms are not properly defined
      }
  
      const bookings = await this.bookingRepository.find({
        where: { property_id: property.id }
      });
  
      if (!bookings.length) {
        console.log(`No bookings found for property ${property.id}`);
        return {
          propertyId: property.id,
          occupancyRate: '0%', // No bookings imply 0% occupancy
          slug: property.slug,
        };
      }
  
      const totalBookedDays = bookings.reduce((total, booking) => {
        if (!booking.check_in || !booking.check_out) {
          console.error(`Invalid dates for booking ${booking.id}`);
          return total; // Skip this booking if dates are invalid
        }
        const days = differenceInDays(booking.check_out, booking.check_in);
        return total + (days * property.rooms);
      }, 0);
  
      const totalAvailableDays = 365 * property.rooms; // Total days available in a year
      const occupancyRate = (totalBookedDays / totalAvailableDays * 100).toFixed(2) + '%';
  
      return {
        propertyId: property.id,
        occupancyRate,
        slug: property.slug,
      };
    }));
  
    return reports.filter(report => report !== null); // Filter out null values from the results
  }
  /* istanbul ignore next */
  async generateFinancialReport(): Promise<any> {
    const bookings = await this.bookingRepository.find();
    if (!bookings.length) {
      console.log('No bookings found');
      return {};
    }

    // Collect all property IDs from the bookings
    const propertyIds = bookings.map(booking => booking.property_id);
    const properties = await this.propertyRepository.findByIds(propertyIds);
    console.log(properties)

    // Map properties by their ID for quick lookup
    const propertyMap = properties.reduce((acc, property) => {
      acc[property.id] = property;
      return acc;
    }, {});

    const financialReport = bookings.reduce((acc, booking) => {
      if (!booking.check_in || !booking.check_out || !propertyMap[booking.property_id]) {
        console.error(`Invalid data for booking ${booking.id}`);
        return acc;
      }

      const nights = differenceInDays(booking.check_out, booking.check_in);
      if (nights < 1) {
        console.error(`Check-out date is not after check-in date for booking ${booking.id}`);
        return acc;
      }

      if (booking.is_paid && booking.is_confirmed) {
        const property = propertyMap[booking.property_id];
        const earnings = property.cost_per_night * nights;
        if (!acc[property.id]) {
          acc[property.id] = {
            earnings: 0,
            numberOfBookings: 0,
            propertyDetails: {
              slug: property.slug,
            }
          };
        }
        acc[property.id].earnings += earnings;
        acc[property.id].numberOfBookings += 1;
      }

      return acc;
    }, {});

    return financialReport;
  }
  /* istanbul ignore next */
  async generateRevenueByCityReport(): Promise<any> {
    const bookings = await this.bookingRepository.find();
    const propertyIds = bookings.map(booking => booking.property_id);
    const properties = await this.propertyRepository.findByIds(propertyIds);

    // Create a map of properties by their ID
    const propertyMap = properties.reduce((acc, property) => {
      acc[property.id] = property;
      return acc;
    }, {});

    // Aggregate earnings by city
    const revenueByCity = bookings.reduce((acc, booking) => {
      if (!booking.check_in || !booking.check_out || !propertyMap[booking.property_id]) {
        console.error(`Invalid data for booking ${booking.id}`);
        return acc;
      }

      const nights = differenceInDays(booking.check_out, booking.check_in);
      if (nights < 1) {
        console.error(`Check-out date is not after check-in date for booking ${booking.id}`);
        return acc;
      }

      if (booking.is_paid && booking.is_confirmed) {
        const property = propertyMap[booking.property_id];
        const earnings = property.cost_per_night * nights;
        const city = property.city;

        if (!acc[city]) {
          acc[city] = {
            earnings: 0,
            numberOfProperties: 0,
            numberOfBookings: 0,
          };
        }
        acc[city].earnings += earnings;
        acc[city].numberOfBookings += 1;
        // Ensure we count each property only once per city
        if (!acc[city].properties || !acc[city].properties.includes(property.id)) {
          acc[city].numberOfProperties += 1;
          acc[city].properties = acc[city].properties || [];
          acc[city].properties.push(property.id);
        }
      }

      return acc;
    }, {});

    return revenueByCity;
  }
  /* istanbul ignore next */
  async generateUserActivityReport(): Promise<any> {
    const bookings = await this.bookingRepository.find();
    if (bookings.length === 0) {
      console.log('No bookings found');
      return {};
    }

    const userIds = bookings.map(booking => booking.user_id);
    const propertyIds = bookings.map(booking => booking.property_id);
    const users = await this.userRepository.findByIds(userIds);
    const properties = await this.propertyRepository.findByIds(propertyIds);

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const propertyMap = properties.reduce((acc, property) => {
      acc[property.id] = property;
      return acc;
    }, {});

    const userActivity = {};

    bookings.forEach(booking => {
      const user = userMap[booking.user_id];
      const property = propertyMap[booking.property_id];

      if (!user || !property || !booking.is_confirmed) {
        return; // Skip unconfirmed bookings or those lacking proper user/property data
      }

      const nights = differenceInDays(booking.check_out, booking.check_in);
      if (nights < 1) {
        console.error(`Invalid booking duration for booking ${booking.id}`);
        return;
      }

      if (booking.is_paid) {
        const earnings = property.cost_per_night * nights;

        if (!userActivity[user.id]) {
          userActivity[user.id] = {
            email: user.email,
            totalBookings: 0,
            totalSpent: 0,
            preferredProperties: {},
            bookingsDetails: []
          };
        }

        userActivity[user.id].totalBookings += 1;
        userActivity[user.id].totalSpent += earnings;

        const propertyType = property.type;
        if (!userActivity[user.id].preferredProperties[propertyType]) {
          userActivity[user.id].preferredProperties[propertyType] = {
            count: 0,
            totalSpent: 0
          };
        }

        userActivity[user.id].preferredProperties[propertyType].count += 1;
        userActivity[user.id].preferredProperties[propertyType].totalSpent += earnings;

        userActivity[user.id].bookingsDetails.push({
          bookingId: booking.id,
          propertyId: property.id,
          propertyType: property.type,
          slug: property.slug,
          costPerNight: property.cost_per_night,
          nights,
          totalCost: earnings
        });
      }
    });

    return userActivity;
  }
 

}