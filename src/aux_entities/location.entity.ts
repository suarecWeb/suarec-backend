export class Location {
    private country: string;
    private city: string;
    private address: string;

    constructor(country: string, city: string, address: string) {
        this.country = country;
        this.city = city;
        this.address = address;
    }
}