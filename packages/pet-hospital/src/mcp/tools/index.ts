export interface Hospital {
  id: string;
  name: string;
  city: string;
  specialty: string[];
  rating: number;
  address: string;
  phone: string;
}

export interface Appointment {
  id: string;
  petId: string;
  hospitalId: string;
  doctorId: string;
  time: string;
  type: 'online' | 'offline';
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface Pet {
  id: string;
  name: string;
  type: 'cat' | 'dog' | 'other';
  age: number;
  breed: string;
  ownerId: string;
}

export class MCPTools {
  async getHospitals(params: { city: string; specialty?: string }): Promise<Hospital[]> {
    // Mock data - replace with actual database call
    const allHospitals = [
      {
        id: 'hospital_001',
        name: '北京宠物医院',
        city: '北京',
        specialty: ['骨科', '内科'],
        rating: 4.8,
        address: '朝阳区xx路1号',
        phone: '010-12345678',
      },
      {
        id: 'hospital_002',
        name: '北京爱宠中心',
        city: '北京',
        specialty: ['眼科', '皮肤科'],
        rating: 4.6,
        address: '海淀区xx路2号',
        phone: '010-87654321',
      },
      {
        id: 'hospital_003',
        name: '北京萌宠诊所',
        city: '北京',
        specialty: ['牙科', '内科'],
        rating: 4.5,
        address: '西城区xx路3号',
        phone: '010-11223344',
      },
      {
        id: 'hospital_004',
        name: '上海宠物中心',
        city: '上海',
        specialty: ['眼科', '牙科'],
        rating: 4.6,
        address: '浦东新区xx路2号',
        phone: '021-87654321',
      },
      {
        id: 'hospital_005',
        name: '广州宠物诊所',
        city: '广州',
        specialty: ['皮肤科', '内科'],
        rating: 4.5,
        address: '天河区xx路3号',
        phone: '020-11223344',
      },
    ];

    let result = allHospitals.filter(h => h.city === params.city);

    if (params.specialty) {
      result = result.filter(h => h.specialty.includes(params.specialty!));
    }

    return result;
  }

  async createAppointment(params: {
    petId: string;
    hospitalId: string;
    doctorId: string;
    time: string;
    type: 'online' | 'offline';
  }): Promise<Appointment> {
    return {
      id: `apt_${Date.now()}`,
      petId: params.petId,
      hospitalId: params.hospitalId,
      doctorId: params.doctorId,
      time: params.time,
      type: params.type,
      status: 'confirmed',
    };
  }

  async getPetInfo(petId: string): Promise<Pet> {
    return {
      id: petId,
      name: '豆豆',
      type: 'dog',
      age: 3,
      breed: '法斗',
      ownerId: 'user_001',
    };
  }
}
