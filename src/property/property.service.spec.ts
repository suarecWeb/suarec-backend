import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PropertyService } from './property.service';
import { Property } from './entities/property.entity';
import { PropertyType } from '../enums/propertyType.enum';
import { Repository, createQueryBuilder } from 'typeorm';

describe('PropertyService', () => {
  let service: PropertyService;

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

  let propertyRepositoryMock: Partial<Record<keyof Repository<Property>, jest.Mock>>;

  propertyRepositoryMock = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(properties),
      getOne: jest.fn().mockResolvedValue(properties[0]), // Asume que devolverá el primer elemento de properties para este ejemplo
      delete: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    })),
    preload: jest.fn(({id, ...updateDto}) => ({
        id,
        ...updateDto
    })),
    create: jest.fn((dto) => ({ id: Math.floor(Math.random() * 100), ...dto })),
    save: jest.fn((dto) => dto),
    remove: jest.fn((propertyP) => {
      properties = properties.filter(property => property != propertyP);
      return Promise.resolve(properties);
    }),
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
    update: jest.fn((id, updateDto) => ({
        id,
        ...updateDto
    })),
    find: jest.fn(() => properties),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        {
          provide: getRepositoryToken(Property),
          useValue: propertyRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a property', async () => {
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

    expect(await service.create(dto)).toEqual({
      id: expect.any(Number),
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
  });

  it('should save a property', async () => {
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

    expect(await service.create(dto)).toEqual({
      id: expect.any(Number),
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
  });

  it('should update a property', async () => {
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

    expect(await service.update('a1', {
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
  });

  it('should get a property', async () => {
    expect(await service.findOne('usa-new-york-123-main-st')).toEqual(
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
    }
    );
  });

  // get all properties
  it('should get all properties', async () => {  
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

    expect(await service.findAll()).toEqual(propertiesExp);

    expect(propertyRepositoryMock.find).toHaveBeenCalledWith();
    expect(propertyRepositoryMock.find).toHaveBeenCalledTimes(1);
  });

  /*
  it('should delete a property', async () => {
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

    const property = {
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
    };

    expect(await service.remove('a1')).toEqual(propertiesAfterRemove);

    expect(propertyRepositoryMock.find).toHaveBeenCalledWith();
    expect(propertyRepositoryMock.find).toHaveBeenCalledTimes(1);
  });*/
});