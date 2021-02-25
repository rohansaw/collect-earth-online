Feature: Home

  Scenario: Sanity Check
    Given I go to collect.earth

  Scenario: Login
    Given I am a visitor
    When I go to the login screen
    And I login
    Then I can see my institutions

  Scenario: Search Insitutions
    Given I am a visitor
    When I search for an institution
    Then I can see matching institutions
