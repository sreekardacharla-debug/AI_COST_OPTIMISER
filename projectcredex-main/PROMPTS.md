The AI summary feature generates dynamic summaries based on the user’s actual audit results instead of returning generic responses.

The prompt uses:
- monthly AI tool spending
- team size
- workload type
- optimisation score
- potential monthly savings
- annual savings
- current tools and plans
- recommendation details

The AI summary explains:
- which tools are underutilised
- where overspending is happening
- which plans can be downgraded
- which alternative tools provide similar features at lower pricing
- how the user can improve workspace efficiency

The prompt references exact audit numbers and recommendation data to ensure the response is personalised for each user audit.

Anthropic AI is used for generating summaries dynamically based on the audit report.

Fallback summaries are used if the API request fails so the application can still provide meaningful optimisation insights to the user.