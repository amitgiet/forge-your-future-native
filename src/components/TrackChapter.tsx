import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MotiView } from 'moti';
import { BookOpen, X, CheckCircle2, Search } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { trackChapter, loadDueLines, getMasteryProgress } from '@/store/slices/neuronzSlice';
import { apiService } from '@/lib/apiService';

interface Chapter {
  _id: string;
  chapterId: string;
  name: { en: string; hi?: string };
  subject: string;
  ncert: { class: number; chapterNumber: number };
  stats?: { totalLines: number };
}

interface TrackChapterProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUBJECTS = ['All', 'Physics', 'Chemistry', 'Biology'];

const TrackChapter: React.FC<TrackChapterProps> = ({ isOpen, onClose }) => {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.neuronz);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [trackedChapter, setTrackedChapter] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadChapters();
  }, [isOpen]);

  const loadChapters = async () => {
    try {
      setLoadingChapters(true);
      const response = await apiService.chapters.getChapters();
      setChapters(response.data.data || []);
      setFilteredChapters(response.data.data || []);
    } catch (err) {
      console.error('Failed to load chapters:', err);
    } finally {
      setLoadingChapters(false);
    }
  };

  // Filter effect — same logic as web
  useEffect(() => {
    let filtered = chapters;
    if (selectedSubject !== 'All') filtered = filtered.filter((ch) => ch.subject === selectedSubject);
    if (searchQuery) {
      filtered = filtered.filter(
        (ch) =>
          ch.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ch.name.hi?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredChapters(filtered);
  }, [selectedSubject, searchQuery, chapters]);

  const handleTrackChapter = async (chapterId: string) => {
    try {
      setTrackedChapter(chapterId);
      await dispatch(trackChapter(chapterId)).unwrap();
      setSuccessMessage('Chapter tracked successfully!');
      dispatch(loadDueLines());
      dispatch(getMasteryProgress());
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to track chapter:', err);
    } finally {
      setTrackedChapter(null);
    }
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
      >
        {/* Sheet — matches web: rounded-t-2xl */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '85%',
            overflow: 'hidden',
          }}
        >
          {/* Sticky Header — matches web: bg-card border-b */}
          <View style={{
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {/* Icon box: w-9 h-9 rounded-xl bg-primary/10 */}
              <View style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: colors.primary + '18',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={20} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, fontFamily: 'Inter_700Bold' }}>
                Track Chapter
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 32, height: 32, borderRadius: 10,
                backgroundColor: colors.muted,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
            {/* Success message */}
            {successMessage && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 200 }}
                style={{
                  padding: 12,
                  backgroundColor: colors.success + '18',
                  borderWidth: 1,
                  borderColor: colors.success + '30',
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} color={colors.success} />
                <Text style={{ fontSize: 14, color: colors.success, fontFamily: 'Inter_500Medium' }}>
                  {successMessage}
                </Text>
              </MotiView>
            )}

            {/* Error message */}
            {error && (
              <View style={{
                padding: 12,
                backgroundColor: colors.destructive + '18',
                borderWidth: 1,
                borderColor: colors.destructive + '30',
                borderRadius: 12,
              }}>
                <Text style={{ fontSize: 14, color: colors.destructive, fontFamily: 'Inter_400Regular' }}>
                  {error}
                </Text>
              </View>
            )}

            {/* Subject pills — horizontal scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {SUBJECTS.map((subject) => (
                  <Pressable
                    key={subject}
                    onPress={() => setSelectedSubject(subject)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 12,
                      backgroundColor: selectedSubject === subject ? colors.primary : colors.muted,
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      fontFamily: 'Inter_600SemiBold',
                      color: selectedSubject === subject ? '#fff' : colors.mutedForeground,
                    }}>
                      {subject}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Search input — matches web */}
            <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center' }}>
              <Search size={16} color={colors.mutedForeground} style={{ position: 'absolute', left: 12, zIndex: 1 }} />
              <TextInput
                placeholder="Search chapters..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  paddingLeft: 36,
                  paddingRight: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.muted + '50',
                  fontSize: 14,
                  color: colors.foreground,
                  fontFamily: 'Inter_400Regular',
                }}
              />
            </View>

            {/* Chapters list */}
            {loadingChapters ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : filteredChapters.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <BookOpen size={40} color={colors.mutedForeground} style={{ opacity: 0.4, marginBottom: 8 }} />
                <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>
                  No chapters found
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {filteredChapters.map((chapter) => (
                  <MotiView
                    key={chapter._id}
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 200 }}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={{ fontSize: 14, fontWeight: '500', color: colors.foreground, fontFamily: 'Inter_500Medium' }}
                        numberOfLines={1}
                      >
                        {chapter.name.en}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <View style={{ backgroundColor: colors.muted, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '500', color: colors.mutedForeground }}>
                            Class {chapter.ncert.class}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: colors.primary + '18', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '500', color: colors.primary }}>
                            {chapter.subject}
                          </Text>
                        </View>
                        {chapter.stats?.totalLines && (
                          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>
                            {chapter.stats.totalLines} lines
                          </Text>
                        )}
                      </View>
                    </View>

                    <Pressable
                      onPress={() => handleTrackChapter(chapter._id)}
                      disabled={isLoading || trackedChapter === chapter._id}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        backgroundColor: colors.primary,
                        borderRadius: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        opacity: (isLoading || trackedChapter === chapter._id || pressed) ? 0.6 : 1,
                      })}
                    >
                      {trackedChapter === chapter._id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : null}
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' }}>
                        {trackedChapter === chapter._id ? 'Tracking' : 'Track'}
                      </Text>
                    </Pressable>
                  </MotiView>
                ))}
              </View>
            )}

            {/* Bottom padding for safe area */}
            <View style={{ height: 32 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default TrackChapter;
