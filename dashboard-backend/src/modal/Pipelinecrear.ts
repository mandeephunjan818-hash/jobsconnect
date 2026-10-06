// modal/PipelineCrear.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear?: number;
  current: boolean;
}

export interface IExperience {
  company: string;
  title: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description?: string;
}

export interface ISkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface IPipelineCrear extends Document {
  userId: string;

  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  country?: string;
  linkedIn?: string;
  portfolio?: string;

  // Profile
  title: string;               // e.g. "Senior Full-Stack Developer"
  summary?: string;

  // Media
  avatarUrl?: string;          // Cloudinary profile photo URL
  resumeUrl?: string;          // Cloudinary resume/CV file URL
  resumePublicId?: string;     // Cloudinary public_id for deletion/replacement

  // Structured data
  education: IEducation[];
  experience: IExperience[];
  skills: ISkill[];

  // Pipeline stage
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

  // Meta
  isPublic: boolean;
  status: 'draft' | 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const EducationSchema = new Schema<IEducation>(
  {
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    fieldOfStudy: { type: String, required: true },
    startYear: { type: Number, required: true },
    endYear: { type: Number },
    current: { type: Boolean, default: false },
  },
  { _id: false }
);

const ExperienceSchema = new Schema<IExperience>(
  {
    company: { type: String, required: true },
    title: { type: String, required: true },
    location: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String },
  },
  { _id: false }
);

const SkillSchema = new Schema<ISkill>(
  {
    name: { type: String, required: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate',
    },
  },
  { _id: false }
);

const PipelineCrearSchema = new Schema<IPipelineCrear>(
  {
    userId: { type: String, required: true, index: true },

    // Personal Info
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    location: { type: String },
    country: { type: String },
    linkedIn: { type: String },
    portfolio: { type: String },

    // Profile
    title: { type: String, required: true },
    summary: { type: String },

    // Media
    avatarUrl: { type: String },
    resumeUrl: { type: String },
    resumePublicId: { type: String },

    // Structured data
    education: { type: [EducationSchema], default: [] },
    experience: { type: [ExperienceSchema], default: [] },
    skills: { type: [SkillSchema], default: [] },

    // Pipeline stage
    stage: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'],
      default: 'applied',
    },

    // Meta
    isPublic: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.PipelineCrear ||
  mongoose.model<IPipelineCrear>('PipelineCrear', PipelineCrearSchema);