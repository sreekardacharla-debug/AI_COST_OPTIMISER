For testing my application, I used Vitest to validate the audit-engine logic and recommendation calculations used inside OptiBlue AI.

The testing mainly focused on checking whether the optimisation calculations and recommendation system were working correctly based on the user’s audit inputs.

## Areas Tested

- pricing fit calculations
- workload scoring
- collaboration scoring
- optimisation score generation
- downgrade recommendation logic
- alternative tool recommendation logic
- savings calculation

The tests helped me identify issues in recommendation generation and ensured that the audit engine was producing expected outputs for different user workloads and pricing plans.

## Running Tests

To run the tests:

npm test