package com.bp.mybooklistback.repository;

import com.bp.mybooklistback.entity.Favorite;
import com.bp.mybooklistback.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByUserOrderByCreatedAtDesc(User user);
    Optional<Favorite> findByUserAndIsbn(User user, String isbn);
    boolean existsByUserAndIsbn(User user, String isbn);
    void deleteByUserAndIsbn(User user, String isbn);
}