import { Schema, model, type InferSchemaType } from 'mongoose';

// The admin-managed list of volunteer role/track options (e.g. "Registration &
// Check-In", "VIP Protocol & Guest Services") — offered as a dropdown on the
// public VolunteerForm (Registration.trackSelected, the applicant's own pick)
// and the admin Volunteers form (Registration.trackAssigned, staff's final
// call). Deliberately its own collection rather than reusing Session's
// `Track` model: that one is tightly coupled to Sessions/Speakers/Abstracts/
// Innovations (color + session/speaker counts, validated by name in three
// other controllers) and mixing volunteer-only entries into it would mean
// retrofitting a `kind` filter into every one of those existing checks for no
// real benefit — volunteer tracks don't need a color accent or session counts.
const volunteerTrackSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

volunteerTrackSchema.index({ order: 1, name: 1 });

export type VolunteerTrackDoc = InferSchemaType<typeof volunteerTrackSchema>;
export const VolunteerTrack = model('VolunteerTrack', volunteerTrackSchema);
