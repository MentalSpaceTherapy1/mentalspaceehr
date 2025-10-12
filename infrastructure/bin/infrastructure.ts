#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MentalSpaceEhrStack } from '../lib/infrastructure-stack';

const app = new cdk.App();
new MentalSpaceEhrStack(app, 'MentalSpaceEhrStack', {
  env: {
    account: '706704660887',
    region: 'us-east-1'
  },
  description: 'HIPAA-compliant infrastructure for MentalSpace EHR',
});