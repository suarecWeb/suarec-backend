
import { Booking } from "../../booking/entities/booking.entity";
import { PropertyType } from "../../enums/propertyType.enum";
import { PaymentMethod } from "../../enums/paymentMethod.enum";
import { v4 as uuid } from 'uuid';
import { User } from "src/user/entities/user.entity";
import { userSeed } from "./user.seed";
import { propertySeed } from "./property.seed";


export const bookingSeed: Booking[] = [
    {
        id: uuid(),
        check_in: new Date(),
        check_out: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 10);
            return date;
        })(),
        property_type: PropertyType.Apartment,
        property_id: propertySeed[0].id,
        user_id: userSeed[0].id,
        num_people: 2,
        payment_method: PaymentMethod.Credit_card,
        is_paid: true,
        is_confirmed: true,
    },
    {
        id: uuid(),
        check_in: new Date(),
        check_out: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 50);
            return date;
        })(),
        property_type: PropertyType.House,
        property_id: propertySeed[1].id,
        user_id: userSeed[1].id,
        num_people: 3,
        payment_method: PaymentMethod.Credit_card,
        is_paid: false,
        is_confirmed: true,
    },
    {
        id: uuid(),
        check_in: new Date(),
        check_out: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 20);
            return date;
        })(),
        property_type: PropertyType.Apartment,
        property_id: propertySeed[2].id,
        user_id: userSeed[2].id,
        num_people: 4,
        payment_method: PaymentMethod.Credit_card,
        is_paid: false,
        is_confirmed: false,
    },
    {
        id: uuid(),
        check_in: new Date(),
        check_out: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 100);
            return date;
        })(),
        property_type: PropertyType.House,
        property_id: propertySeed[3].id,
        user_id: userSeed[3].id,
        num_people: 2,
        payment_method: PaymentMethod.Credit_card,
        is_paid: true,
        is_confirmed: false,
    },
    {
        id: uuid(),
        check_in: new Date(),
        check_out: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 104);
            return date;
        })(),
        property_type: PropertyType.Apartment,
        property_id: propertySeed[4].id,
        user_id: userSeed[4].id,
        num_people: 3,
        payment_method: PaymentMethod.Credit_card,
        is_paid: false,
        is_confirmed: true,
    },
    {
        id: uuid(),
        check_in: new Date(),
        check_out: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 160);
            return date;
        })(),
        property_type: PropertyType.House,
        property_id: propertySeed[5].id,
        user_id: userSeed[5].id,
        num_people: 2,
        payment_method: PaymentMethod.Credit_card,
        is_paid: true,
        is_confirmed: true,
    }
]