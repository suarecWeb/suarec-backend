import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { userSeed } from './data/user.seed';
import { BookingService } from '../booking/booking.service';
import { PropertyService } from '../property/property.service';
import { propertySeed } from './data/property.seed';
import { bookingSeed } from './data/booking.seed';

@Injectable()
export class SeedService {
  constructor(
    
    private readonly userService: UserService,
    private readonly bookingService: BookingService,
    private readonly propertyService: PropertyService,
  ) {}
  /* istanbul ignore next */
  populateDB() {
    const propertySeedWithSlug = propertySeed.map(property => ({
      ...property,
      checkSlug: () => {
        if (!property.slug) {
          property.slug = `${property.country}-${property.city}-${property.address}`;
        }
        property.slug = property.slug.toLowerCase();
      }
    }));
    this.userService.populateWithSeedData(userSeed);
    this.propertyService.populateWithSeedData(propertySeedWithSlug);
    this.bookingService.populateWithSeedData(bookingSeed);
    
    return ` Database seeded
                .  .
          |\_|\
          | a_a\
          | | "]
      ____| '-\___
     /.----.___.-'\
    //        _    \
   //   .-. (~v~) /|
  |'|  /\:  .--  / \
 // |-/  \_/____/\/~|
|/  \ |  []_|_|_] \ |
| \  | \ |___   _\ ]_}
| |  '-' /   '.'  |
| |     /    /|:  | 
| |     |   / |:  /\
| |     /  /  |  /  \
| |    |  /  /  |    \
\ |    |/\/  |/|/\    \
 \|\ |\|  |  | / /\/\__\
  \ \| | /   | |__
       / |   |____)
       |_/
              `;
  }

}