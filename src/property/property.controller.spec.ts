import { Test, TestingModule } from '@nestjs/testing';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { Property } from './entities/property.entity';
import { PropertyType } from '../enums/propertyType.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AuthModule } from '../auth/auth.module';
import { AppModule } from '../app.module';

describe('PropertyController', () => {
  let controller: PropertyController;

  let properties = [
    {
      id: 'a1',
      type: PropertyType.House,
      country: 'USA',
      city: 'New York',
      address: '123 Main St',
      latitude: 40.7128,
      altitude: -74.0060,
      rooms: 3,
      bathrooms: 2,
      area: 150,
      cost_per_night: 200,
      max_people: 6,
      slug: 'usa-new-york-123-main-st'
  },
  {
      id: 'a2',
      type: PropertyType.Apartment,
      country: 'Canada',
      city: 'Toronto',
      address: '456 Queen St',
      latitude: 43.6511,
      altitude: -79.3470,
      rooms: 2,
      bathrooms: 1,
      area: 100,
      cost_per_night: 150,
      max_people: 4,
      slug: 'canada-toronto-456-queen-st'
  },
  {
      id: 'a3',
      type: PropertyType.Chalet,
      country: 'Spain',
      city: 'Barcelona',
      address: '789 Beach Rd',
      latitude: 41.3851,
      altitude: 2.1734,
      rooms: 4,
      bathrooms: 3,
      area: 200,
      cost_per_night: 300,
      max_people: 8,
      slug: 'spain-barcelona-789-beach-rd'
  }
  ];

  // simulamos el servicio
  // debe haber correspondencia en
  // nombres del servicio real
  // y el mock
  const mockPropertyService = {
    // create property
    create: jest.fn( (propertyDto) => 
    ({
      id: 'a' + Math.floor(Math.random() * 100),
      ...propertyDto
    }) ),

    // get properties
    findAll: jest.fn( () => 
    (
      properties
    )),

    // get property (slug o ID)
    findOne: jest.fn( (term) => {
      const byID = properties.find(property => property.id === term);
  
      if (!byID) {
        const bySlug = properties.find(property => property.slug === term);

        if (bySlug) {
          return bySlug;
        } else {
          // Tipo de term no válido
          return "Not found";
        }
      } else {
        return byID;
      }
    }),

    // update
    update: jest.fn( (id, updatePropertyDto) => ({
      id: id,
      ...updatePropertyDto,
    })),

    // delete
    remove: jest.fn( (id) => properties.filter(property => !id.includes(property.id)))
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyController],
      providers: [PropertyService],
      imports: [AuthModule, AppModule],
    }).overrideProvider(PropertyService)
    .useValue(mockPropertyService)
    .compile();;

    controller = module.get<PropertyController>(PropertyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // create property
  it('should create a property', () => {
    const dto = {
      type: PropertyType.Chalet,
      country: 'Colombia',
      city: 'Buga',
      address: 'Calle 2 sur #15A-69',
      latitude: 30.41,
      altitude: 132.145,
      rooms: 2,
      bathrooms: 1,
      area: 50,
      cost_per_night: 20,
      max_people: 4,
      slug: 'colombia-buga-calle-2-sur--15a-69'
    };

    expect(controller.create(dto)).toEqual({
      id: expect.any(String),
      type: PropertyType.Chalet,
      country: 'Colombia',
      city: 'Buga',
      address: 'Calle 2 sur #15A-69',
      latitude: 30.41,
      altitude: 132.145,
      rooms: 2,
      bathrooms: 1,
      area: 50,
      cost_per_night: 20,
      max_people: 4,
      slug: 'colombia-buga-calle-2-sur--15a-69'
    });

    expect(mockPropertyService.create).toHaveBeenCalledWith(dto);
    expect(mockPropertyService.create).toHaveBeenCalledTimes(1);
  });

  // get a property by ID
  it('should get a property', () => {
    expect(controller.findOne('a3')).toEqual(
      {
        id: 'a3',
        type: PropertyType.Chalet,
        country: 'Spain',
        city: 'Barcelona',
        address: '789 Beach Rd',
        latitude: 41.3851,
        altitude: 2.1734,
        rooms: 4,
        bathrooms: 3,
        area: 200,
        cost_per_night: 300,
        max_people: 8,
        slug: 'spain-barcelona-789-beach-rd'
    }
    );

    expect(mockPropertyService.findOne).toHaveBeenCalledWith('a3');
    expect(mockPropertyService.findOne).toHaveBeenCalledTimes(1);
  });

  // get a property by slug
  it('should get a property', () => {
    expect(controller.findOne('canada-toronto-456-queen-st')).toEqual(
      {
        id: 'a2',
        type: PropertyType.Apartment,
        country: 'Canada',
        city: 'Toronto',
        address: '456 Queen St',
        latitude: 43.6511,
        altitude: -79.3470,
        rooms: 2,
        bathrooms: 1,
        area: 100,
        cost_per_night: 150,
        max_people: 4,
        slug: 'canada-toronto-456-queen-st'
    }
    );

    expect(mockPropertyService.findOne).toHaveBeenCalledWith('canada-toronto-456-queen-st');
    expect(mockPropertyService.findOne).toHaveBeenCalledTimes(2);
  });

  // get all properties
  it('should get all properties', () => {  
    const propertiesExp = [
      {
        id: 'a1',
        type: PropertyType.House,
        country: 'USA',
        city: 'New York',
        address: '123 Main St',
        latitude: 40.7128,
        altitude: -74.0060,
        rooms: 3,
        bathrooms: 2,
        area: 150,
        cost_per_night: 200,
        max_people: 6,
        slug: 'usa-new-york-123-main-st'
    },
    {
        id: 'a2',
        type: PropertyType.Apartment,
        country: 'Canada',
        city: 'Toronto',
        address: '456 Queen St',
        latitude: 43.6511,
        altitude: -79.3470,
        rooms: 2,
        bathrooms: 1,
        area: 100,
        cost_per_night: 150,
        max_people: 4,
        slug: 'canada-toronto-456-queen-st'
    },
    {
        id: 'a3',
        type: PropertyType.Chalet,
        country: 'Spain',
        city: 'Barcelona',
        address: '789 Beach Rd',
        latitude: 41.3851,
        altitude: 2.1734,
        rooms: 4,
        bathrooms: 3,
        area: 200,
        cost_per_night: 300,
        max_people: 8,
        slug: 'spain-barcelona-789-beach-rd'
    },
    ]

    expect(controller.findAll()).toEqual(propertiesExp);

    expect(mockPropertyService.findAll).toHaveBeenCalledWith();
    expect(mockPropertyService.findAll).toHaveBeenCalledTimes(1);
  });

  // update
  it('should update a property', () => {  
    const editedProperty = 
      {
        id: 'a1',
        type: PropertyType.House,
        country: 'Edited USA',
        city: 'New York',
        address: '123 Main St',
        latitude: 40.7128,
        altitude: -74.0060,
        rooms: 3,
        bathrooms: 2,
        area: 150,
        cost_per_night: 200,
        max_people: 6,
        slug: 'usa-new-york-123-main-st'
    }

    expect(controller.update('a1', {
      id: 'a1',
      type: PropertyType.House,
      country: 'Edited USA',
      city: 'New York',
      address: '123 Main St',
      latitude: 40.7128,
      altitude: -74.0060,
      rooms: 3,
      bathrooms: 2,
      area: 150,
      cost_per_night: 200,
      max_people: 6,
      slug: 'usa-new-york-123-main-st'
  })).toEqual(editedProperty);

    expect(mockPropertyService.findAll).toHaveBeenCalledWith();
    expect(mockPropertyService.findAll).toHaveBeenCalledTimes(1);
  });

  // delete
  it('should delete a property', () => {
    const propertiesAfterRemove = [
    {
        id: 'a2',
        type: PropertyType.Apartment,
        country: 'Canada',
        city: 'Toronto',
        address: '456 Queen St',
        latitude: 43.6511,
        altitude: -79.3470,
        rooms: 2,
        bathrooms: 1,
        area: 100,
        cost_per_night: 150,
        max_people: 4,
        slug: 'canada-toronto-456-queen-st'
    },
    {
        id: 'a3',
        type: PropertyType.Chalet,
        country: 'Spain',
        city: 'Barcelona',
        address: '789 Beach Rd',
        latitude: 41.3851,
        altitude: 2.1734,
        rooms: 4,
        bathrooms: 3,
        area: 200,
        cost_per_night: 300,
        max_people: 8,
        slug: 'spain-barcelona-789-beach-rd'
    }
    
    ]

    expect(controller.remove('a1')).toEqual(propertiesAfterRemove);

    expect(mockPropertyService.findAll).toHaveBeenCalledWith();
    expect(mockPropertyService.findAll).toHaveBeenCalledTimes(1);
  });
});