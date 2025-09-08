import mongoose from 'mongoose';

const {
  MONGODB_URI = 'mongodb://localhost:27017/civitai',
  MONGODB_DB_NAME = 'civitai',
  MONGODB_COLLECTION_NAME = 'resources',
  MONGODB_JOBS_COLLECTION_NAME = 'jobs',
} = process.env;

export async function connectMongo() {
  mongoose.set('strictQuery', false);
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

  // Resources: гибкая схема, обязательное поле air (с индексом)
  const resourceSchema = new mongoose.Schema(
    {},
    { strict: false, collection: MONGODB_COLLECTION_NAME, timestamps: true }
  );
  resourceSchema.index({ air: 1 }, { unique: true, sparse: false });
  resourceSchema.pre('validate', function (next) {
    if (!this.air || typeof this.air !== 'string') {
      return next(new Error('Field "air" is required and must be a string'));
    }
    next();
  });

  // Jobs: гибкая схема, обязательное поле jobId (с индексом)
  const jobSchema = new mongoose.Schema(
    {},
    { strict: false, collection: MONGODB_JOBS_COLLECTION_NAME, timestamps: true }
  );
  jobSchema.index({ jobId: 1 }, { unique: true, sparse: false });
  jobSchema.pre('validate', function (next) {
    if (!this.jobId || typeof this.jobId !== 'string') {
      return next(new Error('Field "jobId" is required and must be a string'));
    }
    next();
  });

  const Resource = mongoose.models.Resource || mongoose.model('Resource', resourceSchema);
  const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);
  return { Resource, Job, mongoose };
}
