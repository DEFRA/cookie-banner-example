// Cookie preferences page model.
//
// This function returns the data structure that the GOV.UK Design System
// govukRadios macro expects. It generates the radio button configuration
// for the "Do you want to accept analytics cookies?" question.
//
// The `checked` property on each item is set based on the user's current
// cookie policy, so the correct radio is pre-selected when the page loads.

export function cookiesModel (updated, cookiesPolicy = {}) {
  return {
    analytics: {
      idPrefix: 'analytics',
      name: 'analytics',
      fieldset: {
        legend: {
          text: 'Do you want to accept analytics cookies?',
          classes: 'govuk-fieldset__legend--s'
        }
      },
      items: [
        {
          value: true,
          text: 'Yes',
          checked: cookiesPolicy.analytics
        },
        {
          value: false,
          text: 'No',
          checked: !cookiesPolicy.analytics
        }
      ]
    },
    updated
  }
}
