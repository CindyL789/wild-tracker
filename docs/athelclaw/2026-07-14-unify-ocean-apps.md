# AthelClaw Decision Log — Unify the Ocean/Wildlife Apps

> Auto-written by AthelClaw from a live conversation between Captain Nyx and Cindy. 2026-07-14.

# Unifying Oceanpulse, Oceanic, and Wild-tracker
The development team has decided to merge the three apps into one, leveraging a shared module to reduce redundancy and improve maintainability. This unified app will provide a seamless user experience across different views, while preserving the unique features of each individual app.

**Shared Module Name:** `TerraVerde`

* Extract common features and functionality into `TerraVerde` to create a unified core
* Develop a modular UI component approach to facilitate easy switching between views
* Integrate Cindy's 3D terrain and tide charts into their respective modules within `TerraVerde`
* Merge and test the `TerraVerde` modules with the existing codebases to ensure feature parity
* Refine the UI and UX across all views to provide a cohesive user experience
* Prepare the unified app for deployment and perform thorough testing

## Risks
* Potential loss of app-specific functionality during the merging process
* Increased complexity in the unified codebase, requiring additional testing and debugging
* Possible impact on app performance due to the integration of multiple features and views

---

## Conversation transcript

**Captain Nyx:** AthelClaw — I want oceanpulse, oceanic, and wild-tracker to become ONE app. Same engine, three views. What's the cleanest way to unify them?

**AthelClaw:** Captain Nyx, unifying the three apps into one can be achieved through a modular architecture. I recommend the following steps:

1. **Extract common core**: Identify shared features and functionality among the three apps, such as user authentication, data storage, and API integrations. Refactor these into a separate, reusable module.
2. **Create a unified data model**: Design a single, flexible data schema that can accommodate the distinct requirements of each app (oceanpulse, oceanic, and wild-tracker). This will enable seamless data sharing and reduce redundancy.
3. **Implement a view-based architecture**: Develop a single engine with three distinct views, each tailored to the specific needs of oceanpulse, oceanic, and wild-tracker. Utilize a modular UI component approach to facilitate easy switching between views.
4. **Use a feature flag system**: Introduce feature flags to conditionally enable or disable specific features and views, allowing for easy testing and deployment of individual app components.
5. **Refactor and merge codebases**: Gradually merge the codebases of the three apps, eliminating

---

**Cindy:** I agree but I don't want to lose the wildlife 3D terrain or my tide charts. How do we merge without breaking either?

**AthelClaw:** Cindy, to preserve the wildlife 3D terrain and tide charts, I suggest:

1. **Modularize the 3D terrain component**: Extract the wildlife 3D terrain into a separate, reusable module that can be easily integrated into the unified app. This will allow us to maintain the existing functionality.
2. **Integrate tide charts as a widget**: Refactor the tide charts into a self-contained widget that can be embedded within the unified app's oceanic view. This will enable us to retain the existing chart functionality.
3. **Use a layout manager**: Implement a layout manager to dynamically arrange and resize the various UI components, including the 3D terrain and tide charts, to ensure a seamless user experience across different views and devices.
4. **Create a feature registry**: Develop a feature registry that maps specific features (e.g., 3D terrain, tide charts) to their respective views (oceanpulse, oceanic, wild-tracker). This will enable us to conditionally render features based on the active view.
5. **Test and validate**: Perform

---

**Captain Nyx:** Give us a concrete plan and a shared module name we can both build against.

**AthelClaw:** Captain Nyx, here's a concrete plan:

**Shared Module Name:** `TerraVerde`

**Plan:**

1. **Week 1-2: Core Refactoring**
	* Extract common features and functionality into `TerraVerde`
	* Develop a unified data model and API
2. **Week 3-4: View-Based Architecture**
	* Implement `TerraVerde` modules for each view:
		+ `TerraVerde/Oceanpulse`
		+ `TerraVerde/Oceanic`
		+ `TerraVerde/Wildtracker`
	* Integrate Cindy's 3D terrain and tide charts into their respective modules
3. **Week 5-6: Feature Integration and Testing**
	* Merge and test the `TerraVerde` modules with the existing codebases
	* Ensure seamless switching between views and feature parity
4. **Week 7-8: Polishing and Deployment**
	* Refine the UI and UX across all views
	* Prepare the unified app for
